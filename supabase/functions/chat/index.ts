import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const REASONING_EFFORT: Record<string, string> = {
  fast: 'none',       // No reasoning - fastest responses
  standard: 'low',
  deep: 'medium',
  pro: 'high',
  research: 'medium', // + web search
};

// Cost per 1M tokens
const COST_PER_1M: Record<string, { input: number; output: number } | { per_image: number }> = {
  'gpt-5.2': { input: 2.50, output: 10.00 },
  'google/gemini-2.5-flash': { input: 0.10, output: 0.40 },
  'google/gemini-2.5-pro': { input: 2.50, output: 10.00 },
  'openai/gpt-5-mini': { input: 1.00, output: 4.00 },
  'openai/gpt-5': { input: 5.00, output: 20.00 },
  'gpt-image-1': { per_image: 0.04 },
};

// Dialect-specific system prompt instructions
const DIALECT_INSTRUCTIONS: Record<string, string> = {
  msa: `When responding in Arabic, use Modern Standard Arabic (الفصحى). Be formal and use proper classical Arabic grammar. Avoid colloquialisms.
Examples:
- "How are you?": "كيف حالك؟"
- "I want this": "أريد هذا"
- "What happened?": "ماذا حدث؟"`,
  egyptian: `When responding in Arabic, use Egyptian Arabic dialect (مصري). Use common Egyptian expressions like "إيه، كده، ازيك، عايز". Be conversational and warm.
Examples:
- "How are you?": "ازيك؟ عامل ايه؟"
- "I want this": "أنا عايز ده"
- "What happened?": "ايه اللي حصل؟"
- "Why?": "ليه؟"
- "Like this": "كده"`,
  gulf: `When responding in Arabic, use Gulf Arabic dialect (خليجي). Use expressions common in UAE, Saudi, Qatar like "شلونك، وش، هالحين، أبي". Be friendly and direct.
Examples:
- "How are you?": "شلونك؟ عساك طيب"
- "I want this": "أبي هذا"
- "What happened?": "وش صار؟"
- "Now": "الحين"`,
  levantine: `When responding in Arabic, use Levantine Arabic dialect (شامي). Use Syrian/Lebanese/Palestinian expressions like "كيفك، هلق، شو، بدي". Be warm and expressive.
Examples:
- "How are you?": "كيفك؟"
- "I want this": "بدي هاد"
- "What happened?": "شو صار؟"
- "Now": "هلق"`,
  maghrebi: `When responding in Arabic, use Maghrebi Arabic dialect (مغاربي). Use Moroccan/Algerian/Tunisian expressions. Be direct and practical.
Examples:
- "How are you?": "واش راك؟ لاباس؟"
- "I want this": "بغيت هذا"
- "What?": "واش؟"`,
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
  model?: string;
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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('Lovable API key not configured');
    }

    const { 
      messages, 
      mode = 'fast', 
      project_id,
      conversation_id,
      system_instructions, 
      memory_context,
      dialect = 'msa',
      model
    }: ChatRequest = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const selectedModel = model || 'google/gemini-2.5-flash';

    // Determine reasoning effort and max tokens
    const reasoningEffort = REASONING_EFFORT[mode] || 'none';
    let maxCompletionTokens = 2048;

    if (reasoningEffort === 'medium') {
      maxCompletionTokens = 4096;
    } else if (reasoningEffort === 'high') {
      maxCompletionTokens = 16384;
    }

    console.log(`Chat request - Mode: ${mode}, Model: ${selectedModel}, Reasoning: ${reasoningEffort}, Dialect: ${dialect}, Messages: ${messages.length}`);

    // Fetch memory context if not provided (3-tier retrieval)
    let enrichedMemoryContext = memory_context || '';
    
    if (!memory_context) {
      try {
        const memoryParts: string[] = [];

        // 1. Fetch conversation summary (if exists)
        if (conversation_id) {
          const { data: summary } = await supabase
            .from('conversation_summaries')
            .select('summary')
            .eq('conversation_id', conversation_id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (summary?.summary) {
            memoryParts.push(`CONVERSATION CONTEXT:\n${summary.summary.slice(0, 300)}`);
          }
        }

        // 2. Fetch approved project memories (max 5)
        if (project_id) {
          const { data: projectMems } = await supabase
            .from('memory_objects')
            .select('id, content, category')
            .eq('project_id', project_id)
            .eq('status', 'approved')
            .eq('is_active', true)
            .order('confidence', { ascending: false })
            .limit(5);

          if (projectMems?.length) {
            memoryParts.push(`PROJECT CONTEXT:\n${projectMems.map(m => `- ${m.content}`).join('\n')}`);
            
            // Update last_used_at for these memories
            const memoryIds = projectMems.map(m => m.id);
            await supabase
              .from('memory_objects')
              .update({ last_used_at: new Date().toISOString() })
              .in('id', memoryIds);
          }
        }

        // 3. Fetch approved global memories (max 3)
        const { data: globalMems } = await supabase
          .from('memory_objects')
          .select('id, content, category')
          .eq('user_id', user.id)
          .eq('is_global', true)
          .eq('status', 'approved')
          .eq('is_active', true)
          .order('confidence', { ascending: false })
          .limit(3);

        if (globalMems?.length) {
          memoryParts.push(`USER CONTEXT:\n${globalMems.map(m => `- ${m.content}`).join('\n')}`);
          
          // Update last_used_at for these memories
          const memoryIds = globalMems.map(m => m.id);
          await supabase
            .from('memory_objects')
            .update({ last_used_at: new Date().toISOString() })
            .in('id', memoryIds);
        }

        enrichedMemoryContext = memoryParts.join('\n\n');
        console.log(`Memory retrieval - Parts: ${memoryParts.length}, Total length: ${enrichedMemoryContext.length}`);
      } catch (memError) {
        console.warn('Memory retrieval failed, proceeding without memory:', memError);
        // Graceful degradation - continue without memory
      }
    }

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
    if (enrichedMemoryContext) {
      systemContent += `\n\nRELEVANT MEMORIES (User Facts & Preferences):\n${enrichedMemoryContext}\n\nUse these memories to personalize your response, but do not explicitly mention that you are reading from a memory bank unless relevant.`;
    }

    const systemMessage: Message = {
      role: 'system',
      content: systemContent,
    };

    const allMessages = [systemMessage, ...messages];

    // Construct request body with stream_options to get usage data
    const requestBody: any = {
      model: selectedModel,
      messages: allMessages,
      reasoning_effort: reasoningEffort,
      max_completion_tokens: maxCompletionTokens,
      stream: true,
      stream_options: { include_usage: true }, // Request usage data in stream
    };

    // Make request to Lovable Gateway
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable API error:', response.status, errorText);
      
      // Handle specific error codes
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check your Lovable API key.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Lovable API error: ${response.status}`);
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
              const pricingConfig = COST_PER_1M[selectedModel] || COST_PER_1M['gpt-5.2'];
              const modelPricing = pricingConfig as { input: number; output: number };

              const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
              const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
              const totalCost = inputCost + outputCost;
              
              console.log(`Usage - Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${totalCost.toFixed(6)}`);

              // Record individual usage event
              try {
                await supabase.from('usage_events').insert({
                  user_id: user.id,
                  project_id: project_id || null,
                  request_type: 'chat',
                  model_id: selectedModel,
                  prompt_tokens: inputTokens,
                  completion_tokens: outputTokens,
                  total_tokens: totalTokens,
                  cost: totalCost,
                  meta: {
                    conversation_id,
                    mode,
                    dialect,
                    reasoning_effort: reasoningEffort
                  }
                });
                console.log('Usage event recorded');
              } catch (eventError) {
                console.error('Failed to record usage event:', eventError);
              }
              
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
