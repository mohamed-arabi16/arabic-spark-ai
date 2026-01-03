import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured. Please connect the Perplexity connector.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, conversation_id, project_id } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Research request - Query: ${query.substring(0, 50)}...`);

    // Create or get conversation for this research
    let convId = conversation_id;
    if (!convId) {
      // project_id can be null - conversations.project_id is now nullable
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          project_id: project_id || null, // Allow null for "General" conversations
          title: `Research: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`,
          mode: 'research',
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Failed to create conversation:', convError);
        return new Response(
          JSON.stringify({ error: 'Failed to create research conversation', details: convError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      convId = newConv.id;
      console.log(`Created new research conversation: ${convId}`);
    }

    // Save user query as message
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: query,
    });

    // Call Perplexity API with streaming
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide comprehensive, well-sourced information on the given topic. Structure your response clearly with sections. Include key facts, statistics, and cite your sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Perplexity API error: ${response.status}`);
    }

    // Create a transform stream to capture the full response for saving
    let fullContent = '';
    let citations: string[] = [];

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        
        // Parse SSE to extract content and citations
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
              // Capture citations if present
              if (data.citations) {
                citations = data.citations;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
        
        controller.enqueue(chunk);
      },
      async flush() {
        // Save assistant response when stream ends
        try {
          let finalContent = fullContent;
          
          // Append citations if available
          if (citations.length > 0) {
            finalContent += '\n\n---\n**Sources:**\n';
            citations.forEach((url, i) => {
              finalContent += `${i + 1}. ${url}\n`;
            });
          }

          // Estimate tokens for usage tracking
          const estimatedInputTokens = Math.ceil(query.length / 4);
          const estimatedOutputTokens = Math.ceil(finalContent.length / 4);
          const totalTokens = estimatedInputTokens + estimatedOutputTokens;
          // Perplexity sonar pricing ~$1 per million tokens
          const estimatedCost = totalTokens / 1000000;

          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'assistant',
            content: finalContent,
            model_used: 'perplexity-sonar',
            input_tokens: estimatedInputTokens,
            output_tokens: estimatedOutputTokens,
            cost: estimatedCost,
          });

          // Update conversation timestamp
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId);

          // Update usage stats
          const today = new Date().toISOString().split('T')[0];
          
          // First try to get existing usage for today
          const { data: existingUsage } = await supabase
            .from('usage_stats')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle();

          if (existingUsage) {
            // Update existing record
            await supabase
              .from('usage_stats')
              .update({
                total_tokens: (existingUsage.total_tokens || 0) + totalTokens,
                total_cost: (existingUsage.total_cost || 0) + estimatedCost,
                message_count: (existingUsage.message_count || 0) + 2, // user + assistant
              })
              .eq('id', existingUsage.id);
          } else {
            // Insert new record
            await supabase
              .from('usage_stats')
              .insert({
                user_id: user.id,
                date: today,
                total_tokens: totalTokens,
                total_cost: estimatedCost,
                message_count: 2,
              });
          }

          console.log(`Research saved - Conversation: ${convId}, Content length: ${finalContent.length}, Tokens: ${totalTokens}`);
        } catch (err) {
          console.error('Failed to save research response:', err);
        }
      }
    });

    // Pipe response through transform and return
    const streamedResponse = response.body?.pipeThrough(transformStream);

    return new Response(streamedResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Conversation-Id': convId,
      },
    });

  } catch (error) {
    console.error('Error in research function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
