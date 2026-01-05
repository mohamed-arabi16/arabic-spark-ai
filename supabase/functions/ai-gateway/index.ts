import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

// ============================================================================
// MULTI-PROVIDER MODEL REGISTRY
// ============================================================================

type Capability = 'chat' | 'deep_think' | 'deep_research' | 'image' | 'video' | 'transcribe' | 'code';

interface ModelConfig {
  provider: 'openai' | 'google' | 'anthropic';
  actualModel: string;
  capabilities: Capability[];
  displayName: string;
  displayNameAr: string;
  description: string;
  tier: 'free' | 'standard' | 'premium';
  pricing: { input?: number; output?: number; per_image?: number; per_minute?: number };
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // ==================== OPENAI MODELS ====================
  'openai/gpt-5.2': {
    provider: 'openai',
    actualModel: 'gpt-5-2025-08-07',
    capabilities: ['chat', 'deep_think', 'code'],
    displayName: 'GPT-5.2',
    displayNameAr: 'جي بي تي 5.2',
    description: 'Latest flagship model',
    tier: 'premium',
    pricing: { input: 5.00, output: 20.00 },
  },
  'openai/gpt-5-nano': {
    provider: 'openai',
    actualModel: 'gpt-5-nano-2025-08-07',
    capabilities: ['chat'],
    displayName: 'GPT-5 Nano',
    displayNameAr: 'جي بي تي 5 نانو',
    description: 'Fastest, most economical',
    tier: 'free',
    pricing: { input: 0.25, output: 1.00 },
  },
  'openai/gpt-image-1.5': {
    provider: 'openai',
    actualModel: 'gpt-image-1',
    capabilities: ['image'],
    displayName: 'GPT Image 1.5',
    displayNameAr: 'جي بي تي صور 1.5',
    description: 'Advanced image generation',
    tier: 'premium',
    pricing: { per_image: 0.04 },
  },
  'openai/sora-2-pro': {
    provider: 'openai',
    actualModel: 'sora-2-pro',
    capabilities: ['video'],
    displayName: 'Sora 2 Pro',
    displayNameAr: 'سورا 2 برو',
    description: 'Video generation',
    tier: 'premium',
    pricing: { per_minute: 0.10 },
  },
  'openai/o3-deep-research': {
    provider: 'openai',
    actualModel: 'o3-2025-04-16',
    capabilities: ['deep_research'],
    displayName: 'o3 Deep Research',
    displayNameAr: 'o3 بحث عميق',
    description: 'Advanced research model',
    tier: 'premium',
    pricing: { input: 10.00, output: 40.00 },
  },
  
  // ==================== GOOGLE MODELS ====================
  'google/gemini-flash-3': {
    provider: 'google',
    actualModel: 'gemini-2.5-flash',
    capabilities: ['chat', 'code'],
    displayName: 'Gemini Flash 3',
    displayNameAr: 'جيميني فلاش 3',
    description: 'Fast and efficient',
    tier: 'free',
    pricing: { input: 0.10, output: 0.40 },
  },
  'google/gemini-3-pro': {
    provider: 'google',
    actualModel: 'gemini-2.5-pro',
    capabilities: ['chat', 'deep_think', 'deep_research', 'code'],
    displayName: 'Gemini 3 Pro',
    displayNameAr: 'جيميني 3 برو',
    description: 'Best for deep analysis',
    tier: 'premium',
    pricing: { input: 2.50, output: 10.00 },
  },
  'google/nanobanana-pro': {
    provider: 'google',
    actualModel: 'gemini-2.5-flash-preview-05-20',
    capabilities: ['image'],
    displayName: 'NanoBanana Pro',
    displayNameAr: 'نانو بنانا برو',
    description: 'High-quality image generation',
    tier: 'standard',
    pricing: { per_image: 0.03 },
  },
  'google/veo-2.1': {
    provider: 'google',
    actualModel: 'veo-2.0-generate-001',
    capabilities: ['video'],
    displayName: 'Veo 2.1',
    displayNameAr: 'فيو 2.1',
    description: 'Video generation',
    tier: 'premium',
    pricing: { per_minute: 0.08 },
  },

  // ==================== ANTHROPIC MODELS ====================
  'anthropic/opus-4.5': {
    provider: 'anthropic',
    actualModel: 'claude-opus-4-5-20251101',
    capabilities: ['chat', 'deep_think', 'code'],
    displayName: 'Claude Opus 4.5',
    displayNameAr: 'كلود أوبوس 4.5',
    description: 'Most intelligent Claude',
    tier: 'premium',
    pricing: { input: 15.00, output: 75.00 },
  },
  'anthropic/sonnet-4.5': {
    provider: 'anthropic',
    actualModel: 'claude-sonnet-4-5',
    capabilities: ['chat', 'deep_think', 'code'],
    displayName: 'Claude Sonnet 4.5',
    displayNameAr: 'كلود سونيت 4.5',
    description: 'High performance reasoning',
    tier: 'standard',
    pricing: { input: 3.00, output: 15.00 },
  },
  'anthropic/haiku-4.5': {
    provider: 'anthropic',
    actualModel: 'claude-3-5-haiku-20241022',
    capabilities: ['chat'],
    displayName: 'Claude Haiku 4.5',
    displayNameAr: 'كلود هايكو 4.5',
    description: 'Fast responses',
    tier: 'free',
    pricing: { input: 0.25, output: 1.25 },
  },
  'anthropic/deep-research': {
    provider: 'anthropic',
    actualModel: 'claude-opus-4-5-20251101',
    capabilities: ['deep_research'],
    displayName: 'Claude Deep Research',
    displayNameAr: 'كلود بحث عميق',
    description: 'Deep research with Claude',
    tier: 'premium',
    pricing: { input: 15.00, output: 75.00 },
  },
};

// Default models per function/capability
const FUNCTION_DEFAULTS: Record<Capability, string> = {
  chat: 'openai/gpt-5.2',
  deep_think: 'google/gemini-3-pro',
  deep_research: 'google/gemini-3-pro',
  image: 'google/nanobanana-pro',
  video: 'google/veo-2.1',
  transcribe: 'openai/whisper',
  code: 'openai/gpt-5.2',
};

// Mode to model mapping (backward compatibility with existing mode system)
const MODE_MODEL_MAP: Record<string, { model: string; max_tokens: number }> = {
  fast: { model: 'openai/gpt-5-nano', max_tokens: 2048 },
  standard: { model: 'openai/gpt-5.2', max_tokens: 4096 },
  deep: { model: 'google/gemini-3-pro', max_tokens: 8192 },
  pro: { model: 'anthropic/opus-4.5', max_tokens: 16384 },
  research: { model: 'google/gemini-3-pro', max_tokens: 8192 },
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
  action?: 'chat' | 'models' | 'image' | 'deep_think' | 'deep_research' | 'transcribe';
  messages?: Message[];
  mode?: string;
  model?: string; // Direct model override
  project_id?: string;
  conversation_id?: string;
  system_instructions?: string;
  memory_context?: string;
  dialect?: string;
  // For image generation
  prompt?: string;
  size?: string;
  quality?: string;
  // For audio transcription
  audio?: string;
}

// ============================================================================
// PROVIDER AVAILABILITY CHECK
// ============================================================================

function getConfiguredProviders(): { openai: boolean; google: boolean; anthropic: boolean } {
  return {
    openai: !!Deno.env.get('OPENAI_API_KEY'),
    google: !!Deno.env.get('GOOGLE_API_KEY'),
    anthropic: !!Deno.env.get('ANTHROPIC_API_KEY'),
  };
}

function getAvailableModels() {
  const providers = getConfiguredProviders();
  
  const chatModels: Array<{ id: string; name: string; nameAr: string; description: string; tier: string; provider: string; available: boolean; capabilities: Capability[] }> = [];
  const imageModels: Array<{ id: string; name: string; nameAr: string; description: string; tier: string; provider: string; available: boolean }> = [];
  const researchModels: Array<{ id: string; name: string; nameAr: string; description: string; tier: string; provider: string; available: boolean }> = [];
  const videoModels: Array<{ id: string; name: string; nameAr: string; description: string; tier: string; provider: string; available: boolean }> = [];
  
  for (const [modelId, config] of Object.entries(MODEL_REGISTRY)) {
    const isAvailable = providers[config.provider];
    
    const modelInfo = {
      id: modelId,
      name: config.displayName,
      nameAr: config.displayNameAr,
      description: config.description,
      tier: config.tier,
      provider: config.provider,
      available: isAvailable,
      capabilities: config.capabilities,
    };
    
    if (config.capabilities.includes('chat') || config.capabilities.includes('deep_think')) {
      chatModels.push(modelInfo);
    }
    if (config.capabilities.includes('image')) {
      imageModels.push({ ...modelInfo, capabilities: undefined } as any);
    }
    if (config.capabilities.includes('deep_research')) {
      researchModels.push({ ...modelInfo, capabilities: undefined } as any);
    }
    if (config.capabilities.includes('video')) {
      videoModels.push({ ...modelInfo, capabilities: undefined } as any);
    }
  }
  
  return { 
    chatModels, 
    imageModels, 
    researchModels,
    videoModels,
    providers,
    defaults: FUNCTION_DEFAULTS,
  };
}

// ============================================================================
// PROVIDER API CALLS
// ============================================================================

async function callOpenAI(model: string, messages: Message[], config: { max_tokens: number }) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) throw new Error(`Unknown model: ${model}`);
  
  console.log(`Calling OpenAI with model: ${modelConfig.actualModel}`);
  
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelConfig.actualModel,
      messages,
      max_completion_tokens: config.max_tokens,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
}

async function callGoogle(model: string, messages: Message[], config: { max_tokens: number }) {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) throw new Error(`Unknown model: ${model}`);
  
  console.log(`Calling Google with model: ${modelConfig.actualModel}`);
  
  // Convert messages to Gemini format
  const geminiContents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  
  const systemInstruction = messages.find(m => m.role === 'system');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.actualModel}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
        generationConfig: {
          maxOutputTokens: config.max_tokens,
        },
      }),
    }
  );
  
  return response;
}

async function callAnthropic(model: string, messages: Message[], config: { max_tokens: number }) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) throw new Error(`Unknown model: ${model}`);
  
  console.log(`Calling Anthropic with model: ${modelConfig.actualModel}`);
  
  // Extract system message
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const conversationMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));
  
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelConfig.actualModel,
      max_tokens: config.max_tokens,
      system: systemMessage,
      messages: conversationMessages,
      stream: true,
    }),
  });
}

async function callProvider(model: string, messages: Message[], config: { max_tokens: number }) {
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) throw new Error(`Unknown model: ${model}`);
  
  switch (modelConfig.provider) {
    case 'openai':
      return callOpenAI(model, messages, config);
    case 'google':
      return callGoogle(model, messages, config);
    case 'anthropic':
      return callAnthropic(model, messages, config);
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

async function generateImage(prompt: string, model: string, options: { size?: string; quality?: string }) {
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) throw new Error(`Unknown image model: ${model}`);
  
  if (modelConfig.provider === 'openai') {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelConfig.actualModel,
        prompt,
        n: 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'auto',
      }),
    });
    
    return response;
  } else if (modelConfig.provider === 'google') {
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');
    
    // Use Gemini for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.actualModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['image', 'text'],
            imageSizes: options.size || '1024x1024',
          },
        }),
      }
    );
    
    return response;
  }
  
  throw new Error(`Image generation not supported for provider: ${modelConfig.provider}`);
}

// ============================================================================
// STREAM TRANSFORMATION
// ============================================================================

function transformGoogleStream(response: Response): ReadableStream {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  // Transform to OpenAI-compatible format
                  const openaiFormat = {
                    choices: [{ delta: { content: text } }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                }
              } catch {}
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

function transformAnthropicStream(response: Response): ReadableStream {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.type === 'content_block_delta' && json.delta?.text) {
                  // Transform to OpenAI-compatible format
                  const openaiFormat = {
                    choices: [{ delta: { content: json.delta.text } }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                }
              } catch {}
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
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

    // Check that at least one provider is configured
    const providers = getConfiguredProviders();
    if (!providers.openai && !providers.google && !providers.anthropic) {
      return new Response(
        JSON.stringify({ 
          error: 'No AI providers configured',
          code: 'no_api_keys',
          message: 'Please configure at least one AI provider API key.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authentication check
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
      
      const { data: session } = await supabase
        .from('anonymous_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      
      if (session && session.message_count >= MAX_ANONYMOUS_MESSAGES) {
        return new Response(
          JSON.stringify({ 
            error: 'Trial limit reached',
            code: 'trial_limit',
            message: 'You have used all 3 free messages. Sign up to continue!',
            action: 'signup',
            remaining: 0,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (!user && !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ChatRequest = await req.json();
    const action = body.action || url.searchParams.get('action') || 'chat';
    
    // Handle models request via POST
    if (action === 'models') {
      const models = getAvailableModels();
      return new Response(JSON.stringify(models), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle image generation
    if (action === 'image') {
      const { prompt, model: requestedModel, size, quality } = body;
      if (!prompt) throw new Error('Prompt is required for image generation');
      
      const imageModel = requestedModel || FUNCTION_DEFAULTS.image;
      const modelConfig = MODEL_REGISTRY[imageModel];
      
      if (!modelConfig || !modelConfig.capabilities.includes('image')) {
        throw new Error(`Model ${imageModel} does not support image generation`);
      }
      
      if (!providers[modelConfig.provider]) {
        throw new Error(`Provider ${modelConfig.provider} is not configured`);
      }
      
      const response = await generateImage(prompt, imageModel, { size, quality });
      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chat / Deep Think / Research
    const { 
      messages = [], 
      mode = 'standard', 
      model: requestedModel,
      conversation_id,
      system_instructions, 
      memory_context,
      dialect = 'msa',
    } = body;
    
    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    // Determine model: direct model override > mode-based selection
    let selectedModel: string;
    let maxTokens: number;
    
    if (requestedModel && MODEL_REGISTRY[requestedModel]) {
      // Direct model selection
      selectedModel = requestedModel;
      maxTokens = 8192; // Default for direct selection
    } else {
      // Mode-based selection (backward compatible)
      const modeConfig = MODE_MODEL_MAP[mode] || MODE_MODEL_MAP['standard'];
      selectedModel = modeConfig.model;
      maxTokens = modeConfig.max_tokens;
    }
    
    // Validate model is available
    const modelConfig = MODEL_REGISTRY[selectedModel];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${selectedModel}`);
    }
    
    if (!providers[modelConfig.provider]) {
      // Fallback to first available provider
      const fallbackModel = Object.entries(MODEL_REGISTRY).find(
        ([_, config]) => config.capabilities.includes('chat') && providers[config.provider]
      );
      if (fallbackModel) {
        selectedModel = fallbackModel[0];
        console.log(`Provider ${modelConfig.provider} not configured, falling back to ${selectedModel}`);
      } else {
        throw new Error('No chat-capable models available');
      }
    }

    console.log(`AI Gateway - Mode: ${mode}, Model: ${selectedModel}, Dialect: ${dialect}, Anonymous: ${isAnonymous}`);

    // Build system prompt
    let systemContent = `You are a helpful, intelligent AI assistant called "بيت اللسان" (Bayt Al-Lisan). You provide clear, accurate, and thoughtful responses.

Key behaviors:
- Be concise but thorough
- Use markdown formatting when helpful
- Cite sources when making factual claims
- Admit uncertainty when you don't know something
- You understand and can respond in various Arabic dialects`;

    const dialectInstruction = DIALECT_INSTRUCTIONS[dialect] || DIALECT_INSTRUCTIONS.msa;
    systemContent += `\n\nLANGUAGE STYLE:\n${dialectInstruction}`;

    if (system_instructions) {
      systemContent += `\n\nPROJECT INSTRUCTIONS:\n${system_instructions}`;
    }

    if (memory_context) {
      systemContent += `\n\nRELEVANT MEMORIES:\n${memory_context}`;
    }

    const allMessages: Message[] = [
      { role: 'system', content: systemContent },
      ...messages,
    ];

    // Call the appropriate provider
    const response = await callProvider(selectedModel, allMessages, { max_tokens: maxTokens });

    if (!response.ok) {
      const errorText = await response.text();
      const providerName = MODEL_REGISTRY[selectedModel].provider;
      console.error(`Provider error (${providerName}):`, response.status, errorText);
      
      // Handle rate limits
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', code: 'rate_limit' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle billing/credit issues
      if (errorText.includes('credit balance') || errorText.includes('billing') || errorText.includes('purchase credits')) {
        return new Response(
          JSON.stringify({ 
            error: `${providerName.charAt(0).toUpperCase() + providerName.slice(1)} API credits exhausted. Please add credits to your ${providerName} account or select a different provider.`,
            code: 'billing_error',
            provider: providerName
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Provider error: ${response.status}`);
    }

    // Transform stream based on provider
    let stream: ReadableStream;
    const provider = MODEL_REGISTRY[selectedModel].provider;
    
    if (provider === 'openai') {
      stream = response.body!;
    } else if (provider === 'google') {
      stream = transformGoogleStream(response);
    } else if (provider === 'anthropic') {
      stream = transformAnthropicStream(response);
    } else {
      stream = response.body!;
    }

    // Track usage for anonymous users
    if (isAnonymous && sessionId) {
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
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId);
      } else {
        await supabase
          .from('anonymous_sessions')
          .insert({ session_id: sessionId, message_count: 1 });
      }
    }

    // Calculate remaining messages for anonymous users
    let remainingMessages = MAX_ANONYMOUS_MESSAGES;
    if (isAnonymous && sessionId) {
      const { data: session } = await supabase
        .from('anonymous_sessions')
        .select('message_count')
        .eq('session_id', sessionId)
        .single();
      remainingMessages = Math.max(0, MAX_ANONYMOUS_MESSAGES - (session?.message_count || 0));
    }

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Model-Used': selectedModel,
        'X-Provider': provider,
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
