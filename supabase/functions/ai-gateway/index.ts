import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model definitions with provider routing
interface ModelConfig {
  provider: 'openai' | 'lovable';
  tier: 'free' | 'standard' | 'premium';
  type: 'chat' | 'image';
  displayName: string;
  description: string;
  requiresKey?: string;
  pricing: { input: number; output: number } | { per_image: number };
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // Chat models via Lovable Gateway (always available)
  'google/gemini-2.5-flash': {
    provider: 'lovable',
    tier: 'free',
    type: 'chat',
    displayName: 'Gemini Flash',
    description: 'Fast responses, lower cost',
    pricing: { input: 0.10, output: 0.40 },
  },
  'google/gemini-2.5-flash-lite': {
    provider: 'lovable',
    tier: 'free',
    type: 'chat',
    displayName: 'Gemini Flash Lite',
    description: 'Fastest, most economical',
    pricing: { input: 0.05, output: 0.20 },
  },
  'google/gemini-2.5-pro': {
    provider: 'lovable',
    tier: 'premium',
    type: 'chat',
    displayName: 'Gemini Pro',
    description: 'Best for complex reasoning',
    pricing: { input: 2.50, output: 10.00 },
  },
  // OpenAI models via direct API (requires OPENAI_API_KEY)
  'openai/gpt-5': {
    provider: 'openai',
    tier: 'premium',
    type: 'chat',
    displayName: 'GPT-5 Premium',
    description: 'Highest quality, slower',
    requiresKey: 'OPENAI_API_KEY',
    pricing: { input: 5.00, output: 20.00 },
  },
  'openai/gpt-5-mini': {
    provider: 'openai',
    tier: 'standard',
    type: 'chat',
    displayName: 'GPT-5 Mini',
    description: 'Good balance of speed and quality',
    requiresKey: 'OPENAI_API_KEY',
    pricing: { input: 1.00, output: 4.00 },
  },
  'openai/gpt-5-nano': {
    provider: 'openai',
    tier: 'free',
    type: 'chat',
    displayName: 'GPT-5 Nano',
    description: 'Economy option for simple tasks',
    requiresKey: 'OPENAI_API_KEY',
    pricing: { input: 0.25, output: 1.00 },
  },
  // Image models
  'google/gemini-3-pro-image-preview': {
    provider: 'lovable',
    tier: 'premium',
    type: 'image',
    displayName: 'Gemini Image Pro',
    description: 'Next-gen image generation',
    pricing: { per_image: 0.04 },
  },
  'google/gemini-2.5-flash-image': {
    provider: 'lovable',
    tier: 'standard',
    type: 'image',
    displayName: 'Gemini Flash Image',
    description: 'Fast image generation',
    pricing: { per_image: 0.02 },
  },
};

// Mode to model mapping - mode overrides user's default
const MODE_MODEL_MAP: Record<string, { model: string; reasoning_effort: string; max_tokens: number }> = {
  fast: { model: 'google/gemini-2.5-flash-lite', reasoning_effort: 'none', max_tokens: 2048 },
  standard: { model: 'google/gemini-2.5-flash', reasoning_effort: 'low', max_tokens: 4096 },
  deep: { model: 'google/gemini-2.5-pro', reasoning_effort: 'medium', max_tokens: 8192 },
  pro: { model: 'openai/gpt-5', reasoning_effort: 'high', max_tokens: 16384 },
  research: { model: 'google/gemini-2.5-pro', reasoning_effort: 'medium', max_tokens: 8192 },
};

// Dialect-specific system prompt instructions
const DIALECT_INSTRUCTIONS: Record<string, string> = {
  msa: `When responding in Arabic, use Modern Standard Arabic (الفصحى). Be formal and use proper classical Arabic grammar. Avoid colloquialisms.`,
  egyptian: `When responding in Arabic, use Egyptian Arabic dialect (مصري). Use common Egyptian expressions like "إيه، كده، ازيك، عايز".`,
  gulf: `When responding in Arabic, use Gulf Arabic dialect (خليجي). Use expressions common in UAE, Saudi, Qatar like "شلونك، وش، هالحين، أبي".`,
  levantine: `When responding in Arabic, use Levantine Arabic dialect (شامي). Use Syrian/Lebanese/Palestinian expressions like "كيفك، هلق، شو، بدي".`,
  maghrebi: `When responding in Arabic, use Maghrebi Arabic dialect (مغاربي). Use Moroccan/Algerian/Tunisian expressions.`,
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  type?: 'chat' | 'models';
  messages?: Message[];
  mode?: string;
  model?: string;
  project_id?: string;
  conversation_id?: string;
  system_instructions?: string;
  memory_context?: string;
  dialect?: string;
}

function getAvailableModels() {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  
  const chatModels: Array<{ id: string; name: string; description: string; tier: string; available: boolean }> = [];
  const imageModels: Array<{ id: string; name: string; description: string; tier: string; available: boolean }> = [];
  
  for (const [modelId, config] of Object.entries(MODEL_REGISTRY)) {
    const isAvailable = config.requiresKey 
      ? !!Deno.env.get(config.requiresKey) 
      : !!lovableKey;
    
    const modelInfo = {
      id: modelId,
      name: config.displayName,
      description: config.description,
      tier: config.tier,
      available: isAvailable,
    };
    
    if (config.type === 'chat') {
      chatModels.push(modelInfo);
    } else {
      imageModels.push(modelInfo);
    }
  }
  
  return { chatModels, imageModels, hasOpenAI: !!openaiKey };
}

async function callOpenAI(model: string, messages: Message[], config: { reasoning_effort: string; max_tokens: number }) {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Extract actual model name from our namespaced version
  const actualModel = model.replace('openai/', '');
  
  const requestBody: any = {
    model: actualModel === 'gpt-5' ? 'gpt-5-2025-08-07' 
         : actualModel === 'gpt-5-mini' ? 'gpt-5-mini-2025-08-07'
         : actualModel === 'gpt-5-nano' ? 'gpt-5-nano-2025-08-07'
         : actualModel,
    messages,
    max_completion_tokens: config.max_tokens,
    stream: true,
    stream_options: { include_usage: true },
  };
  
  // Note: GPT-5 series doesn't support temperature parameter
  
  console.log(`Calling OpenAI with model: ${requestBody.model}`);
  
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
}

async function callLovableGateway(model: string, messages: Message[], config: { reasoning_effort: string; max_tokens: number }) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) {
    throw new Error('Lovable API key not configured');
  }
  
  const requestBody: any = {
    model,
    messages,
    reasoning_effort: config.reasoning_effort,
    max_completion_tokens: config.max_tokens,
    stream: true,
    stream_options: { include_usage: true },
  };
  
  console.log(`Calling Lovable Gateway with model: ${model}`);
  
  return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // GET request for models list
    if (req.method === 'GET' && url.searchParams.get('action') === 'models') {
      const models = getAvailableModels();
      return new Response(JSON.stringify(models), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const body: ChatRequest = await req.json();
    
    // Handle models request via POST as well
    if (body.type === 'models') {
      const models = getAvailableModels();
      return new Response(JSON.stringify(models), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      messages = [], 
      mode = 'standard', 
      model: requestedModel,
      project_id,
      conversation_id,
      system_instructions, 
      memory_context,
      dialect = 'msa',
    } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    // Determine the actual model to use
    // Priority: 1) Mode's preferred model, 2) User's requested model, 3) Default
    const modeConfig = MODE_MODEL_MAP[mode] || MODE_MODEL_MAP['standard'];
    let selectedModel = modeConfig.model;
    let reasoningEffort = modeConfig.reasoning_effort;
    let maxTokens = modeConfig.max_tokens;
    
    // Check if the mode's preferred model is available
    const modelConfig = MODEL_REGISTRY[selectedModel];
    if (modelConfig?.requiresKey && !Deno.env.get(modelConfig.requiresKey)) {
      // Fallback to Gemini equivalent
      if (selectedModel.startsWith('openai/gpt-5')) {
        selectedModel = 'google/gemini-2.5-pro';
        console.log(`OpenAI key not available, falling back to ${selectedModel}`);
      }
    }

    console.log(`AI Gateway - Mode: ${mode}, Model: ${selectedModel}, Reasoning: ${reasoningEffort}, Dialect: ${dialect}`);

    // Build system prompt
    let systemContent = `You are a helpful, intelligent AI assistant. You provide clear, accurate, and thoughtful responses.\n\nKey behaviors:\n- Be concise but thorough\n- Use markdown formatting when helpful\n- Cite sources when making factual claims\n- Admit uncertainty when you don't know something`;

    // Add dialect-specific instructions
    const dialectInstruction = DIALECT_INSTRUCTIONS[dialect] || DIALECT_INSTRUCTIONS.msa;
    systemContent += `\n\nLANGUAGE STYLE:\n${dialectInstruction}`;

    // Append project specific instructions if present
    if (system_instructions) {
      systemContent += `\n\nPROJECT INSTRUCTIONS:\n${system_instructions}`;
    }

    // Append memory context if present
    if (memory_context) {
      systemContent += `\n\nRELEVANT MEMORIES:\n${memory_context}`;
    }

    const systemMessage: Message = {
      role: 'system',
      content: systemContent,
    };

    const allMessages = [systemMessage, ...messages];

    // Route to appropriate provider
    const finalModelConfig = MODEL_REGISTRY[selectedModel];
    let response: Response;
    
    if (finalModelConfig?.provider === 'openai') {
      response = await callOpenAI(selectedModel, allMessages, { reasoning_effort: reasoningEffort, max_tokens: maxTokens });
    } else {
      response = await callLovableGateway(selectedModel, allMessages, { reasoning_effort: reasoningEffort, max_tokens: maxTokens });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI provider error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', code: 'rate_limit' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please add credits.', code: 'credits_exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check configuration.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI provider error: ${response.status}`);
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
              const pricing = finalModelConfig?.pricing || { input: 0.10, output: 0.40 };
              let totalCost = 0;
              if ('input' in pricing) {
                totalCost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
              }
              
              console.log(`Usage - Model: ${selectedModel}, Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${totalCost.toFixed(6)}`);

              // Record usage event
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
              } catch (eventError) {
                console.error('Failed to record usage event:', eventError);
              }
              
              // Upsert daily usage stats
              const today = new Date().toISOString().split('T')[0];
              
              const { data: existingStats } = await supabase
                .from('usage_stats')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single();
              
              if (existingStats) {
                await supabase
                  .from('usage_stats')
                  .update({
                    total_tokens: (existingStats.total_tokens || 0) + totalTokens,
                    total_cost: (existingStats.total_cost || 0) + totalCost,
                    message_count: (existingStats.message_count || 0) + 1,
                  })
                  .eq('id', existingStats.id);
              } else {
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
            } catch (dbError) {
              console.error('Failed to save usage stats:', dbError);
            }
          }
        } catch (err) {
          controller.error(err);
        }
      }
    });

    // Return stream with model info in headers
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Model-Used': selectedModel,
        'X-Mode': mode,
      },
    });

  } catch (error) {
    console.error('Error in ai-gateway function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
