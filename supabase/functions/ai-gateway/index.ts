import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

// OpenAI-only Model Registry
interface ModelConfig {
  provider: 'openai';
  tier: 'free' | 'standard' | 'premium';
  type: 'chat' | 'image';
  displayName: string;
  displayNameAr: string;
  description: string;
  descriptionAr: string;
  actualModel: string;
  pricing: { input: number; output: number } | { per_image: number };
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'openai/gpt-5-nano': {
    provider: 'openai',
    tier: 'free',
    type: 'chat',
    displayName: 'GPT-5 Nano',
    displayNameAr: 'جي بي تي-5 نانو',
    description: 'Fastest, most economical',
    descriptionAr: 'الأسرع والأكثر اقتصادية',
    actualModel: 'gpt-5-nano-2025-08-07',
    pricing: { input: 0.25, output: 1.00 },
  },
  'openai/gpt-5-mini': {
    provider: 'openai',
    tier: 'standard',
    type: 'chat',
    displayName: 'GPT-5 Mini',
    displayNameAr: 'جي بي تي-5 ميني',
    description: 'Good balance of speed and quality',
    descriptionAr: 'توازن جيد بين السرعة والجودة',
    actualModel: 'gpt-5-mini-2025-08-07',
    pricing: { input: 1.00, output: 4.00 },
  },
  'openai/gpt-5': {
    provider: 'openai',
    tier: 'premium',
    type: 'chat',
    displayName: 'GPT-5',
    displayNameAr: 'جي بي تي-5',
    description: 'Best quality, complex reasoning',
    descriptionAr: 'أفضل جودة، للتفكير المعقد',
    actualModel: 'gpt-5-2025-08-07',
    pricing: { input: 5.00, output: 20.00 },
  },
  // Image generation via OpenAI DALL-E
  'openai/dall-e-3': {
    provider: 'openai',
    tier: 'premium',
    type: 'image',
    displayName: 'DALL-E 3',
    displayNameAr: 'دال-إي 3',
    description: 'High quality image generation',
    descriptionAr: 'توليد صور عالية الجودة',
    actualModel: 'dall-e-3',
    pricing: { per_image: 0.04 },
  },
};

// Mode to model mapping - mode overrides user's default
const MODE_MODEL_MAP: Record<string, { model: string; max_tokens: number }> = {
  fast: { model: 'openai/gpt-5-nano', max_tokens: 2048 },
  standard: { model: 'openai/gpt-5-mini', max_tokens: 4096 },
  deep: { model: 'openai/gpt-5', max_tokens: 8192 },
  pro: { model: 'openai/gpt-5', max_tokens: 16384 },
  research: { model: 'openai/gpt-5', max_tokens: 8192 },
};

// Dialect-specific system prompt instructions
const DIALECT_INSTRUCTIONS: Record<string, string> = {
  msa: `When responding in Arabic, use Modern Standard Arabic (الفصحى). Be formal and use proper classical Arabic grammar. Avoid colloquialisms.`,
  egyptian: `When responding in Arabic, use Egyptian Arabic dialect (مصري). Use common Egyptian expressions like "إيه، كده، ازيك، عايز".`,
  gulf: `When responding in Arabic, use Gulf Arabic dialect (خليجي). Use expressions common in UAE, Saudi, Qatar like "شلونك، وش، هالحين، أبي".`,
  levantine: `When responding in Arabic, use Levantine Arabic dialect (شامي). Use Syrian/Lebanese/Palestinian expressions like "كيفك، هلق، شو، بدي".`,
  maghrebi: `When responding in Arabic, use Maghrebi Arabic dialect (مغاربي). Use Moroccan/Algerian/Tunisian expressions.`,
};

const MAX_ANONYMOUS_MESSAGES = 3;

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
  
  if (!openaiKey) {
    return { 
      chatModels: [], 
      imageModels: [], 
      hasOpenAI: false,
      error: 'OpenAI API key not configured' 
    };
  }
  
  const chatModels: Array<{ id: string; name: string; nameAr: string; description: string; descriptionAr: string; tier: string; available: boolean }> = [];
  const imageModels: Array<{ id: string; name: string; nameAr: string; description: string; descriptionAr: string; tier: string; available: boolean }> = [];
  
  for (const [modelId, config] of Object.entries(MODEL_REGISTRY)) {
    const modelInfo = {
      id: modelId,
      name: config.displayName,
      nameAr: config.displayNameAr,
      description: config.description,
      descriptionAr: config.descriptionAr,
      tier: config.tier,
      available: true,
    };
    
    if (config.type === 'chat') {
      chatModels.push(modelInfo);
    } else {
      imageModels.push(modelInfo);
    }
  }
  
  return { chatModels, imageModels, hasOpenAI: true };
}

async function callOpenAI(model: string, messages: Message[], config: { max_tokens: number }) {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key.');
  }
  
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${model}`);
  }
  
  const requestBody: any = {
    model: modelConfig.actualModel,
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const url = new URL(req.url);
    
    // GET request for models list (public endpoint)
    if (req.method === 'GET' && url.searchParams.get('action') === 'models') {
      const models = getAvailableModels();
      return new Response(JSON.stringify(models), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for OpenAI API key first
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          code: 'no_api_key',
          message: 'The AI service is not configured. Please contact the administrator.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check authentication
    const authHeader = req.headers.get('Authorization');
    const sessionId = req.headers.get('x-session-id');
    
    let user: any = null;
    let isAnonymous = false;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    if (authHeader) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && authUser) {
        user = authUser;
      }
    }
    
    // Anonymous session handling
    if (!user && sessionId) {
      isAnonymous = true;
      
      // Check anonymous usage limits
      const { data: session, error: sessionError } = await supabase
        .from('anonymous_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      
      if (session) {
        if (session.message_count >= MAX_ANONYMOUS_MESSAGES) {
          return new Response(
            JSON.stringify({ 
              error: 'Trial limit reached',
              code: 'trial_limit',
              message: 'You have used all 3 free messages. Sign up to continue!',
              action: 'signup',
              remaining: 0
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // If no auth and no session ID, reject
    if (!user && !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please sign in or try with a session.' }),
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

    // Determine the actual model to use based on mode
    const modeConfig = MODE_MODEL_MAP[mode] || MODE_MODEL_MAP['standard'];
    const selectedModel = modeConfig.model;
    const maxTokens = modeConfig.max_tokens;

    console.log(`AI Gateway - Mode: ${mode}, Model: ${selectedModel}, Dialect: ${dialect}, Anonymous: ${isAnonymous}`);

    // Build system prompt
    let systemContent = `You are a helpful, intelligent AI assistant called "بيت اللسان" (Bayt Al-Lisan). You provide clear, accurate, and thoughtful responses.

Key behaviors:
- Be concise but thorough
- Use markdown formatting when helpful
- Cite sources when making factual claims
- Admit uncertainty when you don't know something
- You understand and can respond in various Arabic dialects`;

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

    // Call OpenAI
    const response = await callOpenAI(selectedModel, allMessages, { max_tokens: maxTokens });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', code: 'rate_limit' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check configuration.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI error: ${response.status}`);
    }

    // Parse the stream to extract usage and pass through to client
    const originalReader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    let usageData: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
    const modelConfig = MODEL_REGISTRY[selectedModel];

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
          
          // After stream ends, update usage tracking
          if (isAnonymous && sessionId) {
            // Update anonymous session message count
            try {
              const { data: existingSession } = await supabase
                .from('anonymous_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();
              
              if (existingSession) {
                await supabase
                  .from('anonymous_sessions')
                  .update({ 
                    message_count: existingSession.message_count + 1,
                    updated_at: new Date().toISOString()
                  })
                  .eq('session_id', sessionId);
              } else {
                await supabase
                  .from('anonymous_sessions')
                  .insert({
                    session_id: sessionId,
                    message_count: 1,
                  });
              }
            } catch (err) {
              console.error('Failed to update anonymous session:', err);
            }
          }
          
          // Save usage stats for authenticated users
          if (user && usageData && conversation_id) {
            try {
              const inputTokens = usageData.prompt_tokens || 0;
              const outputTokens = usageData.completion_tokens || 0;
              const totalTokens = usageData.total_tokens || (inputTokens + outputTokens);
              
              // Calculate cost
              const pricing = modelConfig?.pricing || { input: 1.00, output: 4.00 };
              let totalCost = 0;
              if ('input' in pricing) {
                totalCost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
              }
              
              console.log(`Usage - Model: ${selectedModel}, Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${totalCost.toFixed(6)}`);

              // Check and deduct user credits
              const { data: profile } = await supabase
                .from('profiles')
                .select('credit_balance')
                .eq('id', user.id)
                .single();
              
              if (profile) {
                const newBalance = Math.max(0, (profile.credit_balance || 5) - totalCost);
                await supabase
                  .from('profiles')
                  .update({ credit_balance: newBalance })
                  .eq('id', user.id);
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

    // Calculate remaining messages for anonymous users
    let remainingMessages = 0;
    if (isAnonymous && sessionId) {
      const { data: session } = await supabase
        .from('anonymous_sessions')
        .select('message_count')
        .eq('session_id', sessionId)
        .single();
      remainingMessages = Math.max(0, MAX_ANONYMOUS_MESSAGES - (session?.message_count || 0) - 1);
    }

    // Return stream with model info in headers
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Model-Used': selectedModel,
        'X-Mode': mode,
        'X-Anonymous': isAnonymous ? 'true' : 'false',
        'X-Remaining-Messages': remainingMessages.toString(),
      },
    });

  } catch (error) {
    console.error('AI Gateway error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
