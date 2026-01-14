/**
 * AI Gateway Edge Function
 * 
 * Unified interface for multiple AI providers with:
 * - Multi-provider support (OpenAI, Google, Anthropic, Thaura)
 * - Automatic fallback chains for resilience
 * - Model routing based on capabilities
 * - Anonymous session support with trial limits
 * - Stream transformation for consistent client interface
 * 
 * Uses DIRECT provider API calls - NO third-party gateway services.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

// ============================================================================
// MULTI-PROVIDER MODEL REGISTRY (Direct API calls only)
// ============================================================================

type Capability = 'chat' | 'deep_think' | 'deep_research' | 'image' | 'video' | 'transcribe' | 'code';

interface ModelConfig {
  provider: 'openai' | 'google' | 'anthropic' | 'thaura';
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
  'openai/gpt-4o': {
    provider: 'openai',
    actualModel: 'gpt-4o',
    capabilities: ['chat', 'deep_think', 'code'],
    displayName: 'GPT-4o',
    displayNameAr: 'جي بي تي 4o',
    description: 'Latest flagship model',
    tier: 'premium',
    pricing: { input: 2.50, output: 10.00 },
  },
  'openai/gpt-4o-mini': {
    provider: 'openai',
    actualModel: 'gpt-4o-mini',
    capabilities: ['chat'],
    displayName: 'GPT-4o Mini',
    displayNameAr: 'جي بي تي 4o ميني',
    description: 'Fast and economical',
    tier: 'free',
    pricing: { input: 0.15, output: 0.60 },
  },
  'openai/gpt-image-1': {
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

  // ==================== THAURA MODELS ====================
  'thaura/thaura': {
    provider: 'thaura',
    actualModel: 'thaura',
    capabilities: ['chat', 'deep_think', 'code'],
    displayName: 'Thaura',
    displayNameAr: 'ثورة',
    description: 'Ethical AI with privacy focus',
    tier: 'standard',
    pricing: { input: 0.50, output: 2.00 },
  },
};

// Default models per function/capability
const FUNCTION_DEFAULTS: Record<Capability, string> = {
  chat: 'openai/gpt-4o',
  deep_think: 'google/gemini-3-pro',
  deep_research: 'google/gemini-3-pro',
  image: 'google/nanobanana-pro',
  video: 'google/veo-2.1',
  transcribe: 'openai/whisper',
  code: 'openai/gpt-4o',
};

// Fallback chains per model - when primary fails, try these in order
const FALLBACK_CHAINS: Record<string, string[]> = {
  // OpenAI fallbacks
  'openai/gpt-4o': ['google/gemini-3-pro', 'anthropic/sonnet-4.5'],
  'openai/gpt-4o-mini': ['google/gemini-flash-3', 'anthropic/haiku-4.5'],
  'openai/gpt-image-1': ['google/nanobanana-pro'],
  // Google fallbacks
  'google/gemini-3-pro': ['openai/gpt-4o', 'anthropic/sonnet-4.5'],
  'google/gemini-flash-3': ['openai/gpt-4o-mini', 'anthropic/haiku-4.5'],
  'google/nanobanana-pro': ['openai/gpt-image-1'],
  // Anthropic fallbacks
  'anthropic/opus-4.5': ['openai/gpt-4o', 'google/gemini-3-pro'],
  'anthropic/sonnet-4.5': ['google/gemini-3-pro', 'openai/gpt-4o'],
  'anthropic/haiku-4.5': ['google/gemini-flash-3', 'openai/gpt-4o-mini'],
  'anthropic/deep-research': ['google/gemini-3-pro'],
};

// Mode to model mapping (backward compatibility with existing mode system)
const MODE_MODEL_MAP: Record<string, { model: string; max_tokens: number }> = {
  fast: { model: 'openai/gpt-4o-mini', max_tokens: 2048 },
  standard: { model: 'openai/gpt-4o', max_tokens: 4096 },
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
  action?: 'chat' | 'models' | 'image' | 'deep_think' | 'deep_research' | 'transcribe' | 'test_provider';
  messages?: Message[];
  mode?: string;
  model?: string; // Direct model override
  routing_mode?: 'auto' | 'manual';
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
  // For provider testing
  provider?: string;
}

// ============================================================================
// PROVIDER AVAILABILITY CHECK
// ============================================================================

function getConfiguredProviders(): { openai: boolean; google: boolean; anthropic: boolean; thaura: boolean } {
  return {
    openai: !!Deno.env.get('OPENAI_API_KEY'),
    google: !!Deno.env.get('GOOGLE_API_KEY'),
    anthropic: !!Deno.env.get('ANTHROPIC_API_KEY'),
    thaura: !!Deno.env.get('THAURA_API_KEY'),
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

async function callThaura(model: string, messages: Message[], config: { max_tokens: number }) {
  const apiKey = Deno.env.get('THAURA_API_KEY');
  if (!apiKey) throw new Error('THAURA_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[model];
  if (!modelConfig) throw new Error(`Unknown model: ${model}`);
  
  console.log(`Calling Thaura with model: ${modelConfig.actualModel}`);
  
  // Thaura uses OpenAI-compatible API format
  return fetch('https://backend.thaura.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelConfig.actualModel,
      messages,
      max_tokens: config.max_tokens,
      stream: true,
      stream_options: { include_usage: true },
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
    case 'thaura':
      return callThaura(model, messages, config);
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

// ============================================================================
// FALLBACK-AWARE PROVIDER CALLS
// ============================================================================

interface CallWithFallbackResult {
  response: Response;
  modelUsed: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

async function callWithFallback(
  primaryModel: string, 
  messages: Message[], 
  config: { max_tokens: number },
  providers: { openai: boolean; google: boolean; anthropic: boolean; thaura: boolean }
): Promise<CallWithFallbackResult> {
  const chain = [primaryModel, ...(FALLBACK_CHAINS[primaryModel] || [])];
  let lastError: Error | null = null;
  let fallbackUsed = false;
  let fallbackReason = '';
  
  for (const model of chain) {
    const modelConfig = MODEL_REGISTRY[model];
    if (!modelConfig) continue;
    
    // Check if provider is configured
    if (!providers[modelConfig.provider]) {
      console.log(`Skipping ${model}: provider ${modelConfig.provider} not configured`);
      fallbackUsed = true;
      fallbackReason = `${modelConfig.provider} not configured`;
      continue;
    }
    
    try {
      const response = await callProvider(model, messages, config);
      
      if (response.ok) {
        return { 
          response, 
          modelUsed: model, 
          fallbackUsed: fallbackUsed && model !== primaryModel,
          fallbackReason 
        };
      }
      
      // Check for rate limit / billing errors - try fallback
      if (response.status === 429 || response.status === 402) {
        console.log(`Model ${model} returned ${response.status}, trying fallback`);
        lastError = new Error(`Provider ${modelConfig.provider} returned ${response.status}`);
        fallbackUsed = true;
        fallbackReason = response.status === 429 ? 'rate_limit' : 'billing';
        continue;
      }
      
      // Other errors - try fallback
      const errorText = await response.text();
      console.error(`Model ${model} error:`, response.status, errorText);
      lastError = new Error(`Provider error: ${response.status}`);
      fallbackUsed = true;
      fallbackReason = 'provider_error';
      continue;
      
    } catch (err) {
      console.error(`Exception calling ${model}:`, err);
      lastError = err instanceof Error ? err : new Error('Unknown error');
      fallbackUsed = true;
      fallbackReason = 'exception';
    }
  }
  
  throw lastError || new Error('All providers failed');
}

// ============================================================================
// PROVIDER TESTING
// ============================================================================

async function testProviderConnection(provider: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const providers = getConfiguredProviders();
    
    if (!providers[provider as keyof typeof providers]) {
      return { valid: false, error: 'API key not configured' };
    }
    
    // Simple validation call per provider
    if (provider === 'openai') {
      const apiKey = Deno.env.get('OPENAI_API_KEY');
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        const error = await response.text();
        return { valid: false, error: `HTTP ${response.status}` };
      }
      return { valid: true };
    }
    
    if (provider === 'google') {
      const apiKey = Deno.env.get('GOOGLE_API_KEY');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (!response.ok) {
        return { valid: false, error: `HTTP ${response.status}` };
      }
      return { valid: true };
    }
    
    if (provider === 'anthropic') {
      // Anthropic doesn't have a models endpoint, so we just verify the key format
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!apiKey || !apiKey.startsWith('sk-ant-')) {
        return { valid: false, error: 'Invalid key format' };
      }
      return { valid: true };
    }
    
    if (provider === 'thaura') {
      const apiKey = Deno.env.get('THAURA_API_KEY');
      if (!apiKey) {
        return { valid: false, error: 'API key not configured' };
      }
      // Test by making a minimal API call
      try {
        const response = await fetch('https://backend.thaura.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          return { valid: false, error: `HTTP ${response.status}` };
        }
        return { valid: true };
      } catch {
        // If models endpoint doesn't exist, just verify key is set
        return { valid: true };
      }
    }
    
    return { valid: false, error: 'Unknown provider' };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
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

    // Handle provider testing
    if (action === 'test_provider') {
      const { provider } = body;
      if (!provider) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Provider not specified' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = await testProviderConnection(provider);
      return new Response(JSON.stringify(result), {
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
      routing_mode,
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
    
    // Validate model exists in registry
    if (!MODEL_REGISTRY[selectedModel]) {
      throw new Error(`Unknown model: ${selectedModel}`);
    }

    console.log(`AI Gateway - Mode: ${mode}, Model: ${selectedModel}, Dialect: ${dialect}, Anonymous: ${isAnonymous}`);

    // Get model display info for identity
    const modelConfig = MODEL_REGISTRY[selectedModel];
    const modelDisplayName = modelConfig?.displayName || 'AI Assistant';
    const modelDisplayNameAr = modelConfig?.displayNameAr || 'مساعد ذكي';

    // Build system prompt
    let systemContent = `You are a helpful, intelligent AI assistant called "بيت اللسان" (Bayt Al-Lisan). You provide clear, accurate, and thoughtful responses.

Key behaviors:
- Be concise but thorough
- Use markdown formatting when helpful
- Cite sources when making factual claims
- Admit uncertainty when you don't know something
- You understand and can respond in various Arabic dialects

MODEL IDENTITY:
You are currently running as ${modelDisplayName} (${modelDisplayNameAr}). When users ask "who are you", "what model are you", "which AI are you", or similar questions about your identity, respond that you are "${modelDisplayName}" provided through AI Workspace / بيت اللسان.
IMPORTANT: Do NOT claim to be GPT-4, GPT-3.5, ChatGPT, Claude, Gemini, or any other specific model name unless you actually ARE that model. Be honest about your true identity as ${modelDisplayName}.`;

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

    // Call with fallback chain for resilience
    let callResult: CallWithFallbackResult;
    try {
      callResult = await callWithFallback(selectedModel, allMessages, { max_tokens: maxTokens }, providers);
    } catch (err) {
      console.error('All providers failed:', err);
      return new Response(
        JSON.stringify({ 
          error: 'All AI providers are currently unavailable. Please try again later.',
          code: 'all_providers_failed',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { response, modelUsed, fallbackUsed, fallbackReason } = callResult;

    // Transform stream based on provider
    let stream: ReadableStream;
    const provider = MODEL_REGISTRY[modelUsed].provider;
    
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

    const resolvedRoutingMode = routing_mode || (requestedModel ? 'manual' : 'auto');

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Model-Used': modelUsed,
        'X-Model-Requested': selectedModel,
        'X-Provider': provider,
        'X-Mode': mode,
        'X-Routing-Mode': resolvedRoutingMode,
        'X-Anonymous': isAnonymous ? 'true' : 'false',
        'X-Remaining-Messages': remainingMessages.toString(),
        'X-Fallback-Used': fallbackUsed ? 'true' : 'false',
        'X-Fallback-Reason': fallbackReason || '',
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
