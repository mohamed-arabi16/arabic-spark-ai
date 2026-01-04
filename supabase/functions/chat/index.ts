import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All text modes use GPT-5.2 with different reasoning efforts
const TEXT_MODEL = 'gpt-5.2';

const REASONING_EFFORT: Record<string, string> = {
  fast: 'none',       // No reasoning - fastest responses
  standard: 'low',
  deep: 'medium',
  pro: 'high',
  research: 'medium', // + web search
};

// Cost per 1M tokens
const COST_PER_1M = {
  'gpt-5.2': {
    input: 2.50,
    output: 10.00,
  },
  'gpt-image-1': { per_image: 0.04 },
};

// Dialect-specific system prompt instructions
const DIALECT_INSTRUCTIONS: Record<string, string> = {
  msa: `When responding in Arabic, use Modern Standard Arabic (الفصحى). Be formal and use proper classical Arabic grammar. Avoid colloquialisms.`,
  egyptian: `When responding in Arabic, use Egyptian Arabic dialect (مصري). Use common Egyptian expressions like "إيه، كده، ازيك، عايز". Be conversational and warm.`,
  gulf: `When responding in Arabic, use Gulf Arabic dialect (خليجي). Use expressions common in UAE, Saudi, Qatar like "شلونك، وش، هالحين، أبي". Be friendly and direct.`,
  levantine: `When responding in Arabic, use Levantine Arabic dialect (شامي). Use Syrian/Lebanese/Palestinian expressions like "كيفك، هلق، شو، بدي". Be warm and expressive.`,
  maghrebi: `When responding in Arabic, use Maghrebi Arabic dialect (مغاربي). Use Moroccan/Algerian/Tunisian expressions. Be direct and practical.`,
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  mode: string;
  project_id?: string;
  conversation_id?: string;
  system_instructions?: string;
  memory_context?: string;
  dialect?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OpenAI API key not configured');
    }

    const { 
      messages, 
      mode = 'fast', 
      project_id,
      conversation_id,
      system_instructions, 
      memory_context,
      dialect = 'msa'
    }: ChatRequest = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Determine reasoning effort and max tokens
    const reasoningEffort = REASONING_EFFORT[mode] || 'none';
    let maxCompletionTokens = 2048;

    if (reasoningEffort === 'medium') {
      maxCompletionTokens = 4096;
    } else if (reasoningEffort === 'high') {
      maxCompletionTokens = 16384;
    }

    console.log(`Chat request - Mode: ${mode}, Model: ${TEXT_MODEL}, Reasoning: ${reasoningEffort}, Dialect: ${dialect}, Messages: ${messages.length}`);

    // Build base system prompt
    let systemContent = `You are a helpful, intelligent AI assistant. You provide clear, accurate, and thoughtful responses.

Key behaviors:
- Be concise but thorough
- Use markdown formatting when helpful
- Cite sources when making factual claims
- Admit uncertainty when you don't know something`;

    // Add dialect-specific instructions
    const dialectInstruction = DIALECT_INSTRUCTIONS[dialect] || DIALECT_INSTRUCTIONS.msa;
    systemContent += `\n\nLANGUAGE STYLE:\n${dialectInstruction}`;

    // Append project specific instructions if present
    if (system_instructions) {
      systemContent += `\n\nPROJECT INSTRUCTIONS:\n${system_instructions}`;
    }

    // Append memory context if present
    if (memory_context) {
      systemContent += `\n\nRELEVANT MEMORIES (User Facts & Preferences):\n${memory_context}\n\nUse these memories to personalize your response, but do not explicitly mention that you are reading from a memory bank unless relevant.`;
    }

    const systemMessage: Message = {
      role: 'system',
      content: systemContent,
    };

    const allMessages = [systemMessage, ...messages];

    // Construct request body with stream_options to get usage data
    const requestBody: any = {
      model: TEXT_MODEL,
      messages: allMessages,
      reasoning_effort: reasoningEffort,
      max_completion_tokens: maxCompletionTokens,
      stream: true,
      stream_options: { include_usage: true }, // Request usage data in stream
    };

    // Make request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Handle specific error codes
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check your OpenAI API key.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Parse the stream to extract usage and pass through to client
    const originalReader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    let usageData: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;

    // Create a pass-through stream that captures usage data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await originalReader.read();
            if (done) break;
            
            // Parse the chunk to extract usage
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.usage) {
                    usageData = json.usage;
                    console.log('Received usage data:', usageData);
                  }
                } catch {
                  // Not valid JSON, ignore
                }
              }
            }
            
            // Pass through the chunk unchanged
            controller.enqueue(value);
          }
          
          controller.close();
          
          // After stream ends, save usage to database
          if (usageData && conversation_id) {
            try {
              const inputTokens = usageData.prompt_tokens || 0;
              const outputTokens = usageData.completion_tokens || 0;
              const totalTokens = usageData.total_tokens || (inputTokens + outputTokens);
              
              // Calculate cost
              const modelPricing = COST_PER_1M['gpt-5.2'];
              const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
              const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
              const totalCost = inputCost + outputCost;
              
              console.log(`Usage - Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${totalCost.toFixed(6)}`);
              
              // Upsert daily usage stats
              const today = new Date().toISOString().split('T')[0];
              
              // First try to get existing stats for today
              const { data: existingStats } = await supabase
                .from('usage_stats')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single();
              
              if (existingStats) {
                // Update existing
                await supabase
                  .from('usage_stats')
                  .update({
                    total_tokens: (existingStats.total_tokens || 0) + totalTokens,
                    total_cost: (existingStats.total_cost || 0) + totalCost,
                    message_count: (existingStats.message_count || 0) + 1,
                  })
                  .eq('id', existingStats.id);
              } else {
                // Insert new
                await supabase
                  .from('usage_stats')
                  .insert({
                    user_id: user.id,
                    date: today,
                    total_tokens: totalTokens,
                    total_cost: totalCost,
                    message_count: 1,
                    image_count: 0,
                  });
              }
              
              console.log('Usage stats saved successfully');
            } catch (dbError) {
              console.error('Failed to save usage stats:', dbError);
            }
          }
        } catch (err) {
          controller.error(err);
        }
      }
    });

    // Stream the response back
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
