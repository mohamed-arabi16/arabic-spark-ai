/**
 * Chat Edge Function
 * 
 * Main chat endpoint with streaming responses, dialect support,
 * memory injection, and multi-provider AI support.
 * 
 * Supports: Google Gemini, OpenAI, Anthropic, and Thaura AI providers.
 * Uses direct API calls - NO third-party gateway services.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// MODEL REGISTRY - Direct provider configuration (no third-party gateways)
// =============================================================================

interface ModelConfig {
  provider: 'openai' | 'google' | 'anthropic' | 'thaura';
  actualModel: string;
  displayName: string;
  displayNameAr: string;
  maxTokens: number;
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // OpenAI Models
  'openai/gpt-4o': {
    provider: 'openai',
    actualModel: 'gpt-4o',
    displayName: 'GPT-4o',
    displayNameAr: 'جي بي تي 4o',
    maxTokens: 4096,
  },
  'openai/gpt-4o-mini': {
    provider: 'openai',
    actualModel: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    displayNameAr: 'جي بي تي 4o ميني',
    maxTokens: 4096,
  },
  // Google Models
  'google/gemini-flash-3': {
    provider: 'google',
    actualModel: 'gemini-2.5-flash',
    displayName: 'Gemini Flash 3',
    displayNameAr: 'جيميني فلاش 3',
    maxTokens: 8192,
  },
  'google/gemini-3-pro': {
    provider: 'google',
    actualModel: 'gemini-2.5-pro',
    displayName: 'Gemini 3 Pro',
    displayNameAr: 'جيميني 3 برو',
    maxTokens: 8192,
  },
  // Anthropic Models
  'anthropic/sonnet-4.5': {
    provider: 'anthropic',
    actualModel: 'claude-sonnet-4-5',
    displayName: 'Claude Sonnet 4.5',
    displayNameAr: 'كلود سونيت 4.5',
    maxTokens: 4096,
  },
  'anthropic/haiku-4.5': {
    provider: 'anthropic',
    actualModel: 'claude-3-5-haiku-20241022',
    displayName: 'Claude Haiku 4.5',
    displayNameAr: 'كلود هايكو 4.5',
    maxTokens: 4096,
  },
  'anthropic/opus-4.5': {
    provider: 'anthropic',
    actualModel: 'claude-opus-4-5-20251101',
    displayName: 'Claude Opus 4.5',
    displayNameAr: 'كلود أوبوس 4.5',
    maxTokens: 4096,
  },
  // Thaura Model
  'thaura/thaura': {
    provider: 'thaura',
    actualModel: 'thaura',
    displayName: 'Thaura',
    displayNameAr: 'ثورة',
    maxTokens: 4096,
  },
};

// Model display name lookup for AI identity
const MODEL_DISPLAY_NAMES: Record<string, { displayName: string; displayNameAr: string }> = {};
for (const [id, config] of Object.entries(MODEL_REGISTRY)) {
  MODEL_DISPLAY_NAMES[id] = { displayName: config.displayName, displayNameAr: config.displayNameAr };
}

// =============================================================================
// REASONING EFFORT & PRICING CONFIGURATION
// =============================================================================

const REASONING_EFFORT: Record<string, string> = {
  fast: 'none',       // No reasoning - fastest responses
  standard: 'low',
  deep: 'medium',
  pro: 'high',
  research: 'medium', // + web search
};

// Cost per 1M tokens for pricing calculation
const COST_PER_1M: Record<string, { input: number; output: number } | { per_image: number }> = {
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'google/gemini-flash-3': { input: 0.10, output: 0.40 },
  'google/gemini-3-pro': { input: 2.50, output: 10.00 },
  'anthropic/opus-4.5': { input: 15.00, output: 75.00 },
  'anthropic/sonnet-4.5': { input: 3.00, output: 15.00 },
  'anthropic/haiku-4.5': { input: 0.25, output: 1.25 },
  'thaura/thaura': { input: 0.50, output: 2.00 },
  'openai/dall-e-3': { per_image: 0.04 },
  'openai/gpt-image-1': { per_image: 0.04 },
  'google/nanobanana': { per_image: 0.03 },
};

// =============================================================================
// DIALECT DETECTION - Enhanced markers for accurate detection
// =============================================================================

// Dialect markers with weighted scoring for better accuracy
const DIALECT_MARKERS: Record<string, { patterns: RegExp; weight: number }[]> = {
  egyptian: [
    { patterns: /\bإيه\b|\bعايز\b|\bكده\b|\bازيك\b|\bازاي\b/g, weight: 2 },
    { patterns: /\bليه\b|\bمش\b|\bده\b|\bدي\b|\bبتاع\b/g, weight: 1.5 },
    { patterns: /\bطب\b|\bاوي\b|\bكمان\b|\bعشان\b|\bفين\b/g, weight: 1 },
    { patterns: /\bماشي\b|\bتمام\b|\bيعني\b|\bحاجة\b/g, weight: 0.8 },
  ],
  gulf: [
    { patterns: /\bشلونك\b|\bوش\b|\bهالحين\b|\bأبي\b|\bابي\b/g, weight: 2 },
    { patterns: /\bيالله\b|\bزين\b|\bحده\b|\bاشوفك\b|\bابغى\b/g, weight: 1.5 },
    { patterns: /\bكذا\b|\bوايد\b|\bخلاص\b|\bيبيله\b|\bعيل\b/g, weight: 1 },
    { patterns: /\bهلا\b|\bتوني\b|\bيمديك\b|\bيصير\b/g, weight: 0.8 },
  ],
  levantine: [
    { patterns: /\bهلق\b|\bهلأ\b|\bشو\b|\bبدي\b|\bكيفك\b/g, weight: 2 },
    { patterns: /\bهيك\b|\bمنيح\b|\bبعدين\b|\bليش\b|\bهاد\b/g, weight: 1.5 },
    { patterns: /\bكتير\b|\bهلا\b|\bيعني\b|\bاشي\b|\bعن جد\b/g, weight: 1 },
    { patterns: /\bمبلا\b|\bمشان\b|\bقديش\b|\bوين\b/g, weight: 0.8 },
  ],
  maghrebi: [
    { patterns: /\bواش\b|\bراك\b|\bبغيت\b|\bلاباس\b|\bكيداير\b/g, weight: 2 },
    { patterns: /\bزوين\b|\bبزاف\b|\bماشي\b|\bكيفاش\b|\bفين\b/g, weight: 1.5 },
    { patterns: /\bغير\b|\bهاذ\b|\bياك\b|\bبركا\b|\bخويا\b/g, weight: 1 },
    { patterns: /\bديالي\b|\bدابا\b|\bيلاه\b|\bمعلبالك\b/g, weight: 0.8 },
  ],
};

/**
 * Detect dialect from text using weighted marker scoring
 * 
 * Uses a weighted scoring system where more distinctive dialect markers
 * have higher weights. Returns confidence based on total score.
 * 
 * @param text - Input text to analyze
 * @returns Detected dialect, confidence level, and matched markers
 */
function detectDialectFromText(text: string): { dialect: string; confidence: string; markers: string[]; score: number } {
  const scores: Record<string, { score: number; markers: string[] }> = {};
  
  for (const [dialect, markerGroups] of Object.entries(DIALECT_MARKERS)) {
    let totalScore = 0;
    const foundMarkers: string[] = [];
    
    for (const { patterns, weight } of markerGroups) {
      const matches = text.match(patterns);
      if (matches) {
        const uniqueMatches = [...new Set(matches)];
        totalScore += uniqueMatches.length * weight;
        foundMarkers.push(...uniqueMatches);
      }
    }
    
    scores[dialect] = { score: totalScore, markers: [...new Set(foundMarkers)] };
  }
  
  // Find dialect with highest score
  let topDialect = 'msa';
  let maxScore = 0;
  let markers: string[] = [];
  
  for (const [dialect, { score, markers: found }] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topDialect = dialect;
      markers = found;
    }
  }
  
  // Determine confidence based on weighted score thresholds
  let confidence = 'none';
  if (maxScore >= 5) confidence = 'high';
  else if (maxScore >= 3) confidence = 'medium';
  else if (maxScore >= 1) confidence = 'low';
  
  return { dialect: topDialect, confidence, markers, score: maxScore };
}

/**
 * Build dialect-specific system prompt instructions
 * 
 * Creates detailed linguistic guidelines for AI responses in the specified
 * Arabic dialect, including grammar, vocabulary, and cultural nuances.
 * 
 * @param dialect - Target dialect code (msa, egyptian, gulf, levantine, maghrebi)
 * @param options - Additional style options (formality, code-switching, numerals)
 * @returns Formatted instruction string for system prompt
 */
function buildDialectInstructions(dialect: string, options: { formality?: string; codeSwitch?: string; numeralMode?: string } = {}): string {
  const dialectRules: Record<string, string> = {
    msa: `VARIETY: Modern Standard Arabic (الفصحى)
GRAMMAR: Classical Arabic grammar with optional case endings (إعراب)
VOCABULARY: Formal register, use فصيح vocabulary, avoid colloquialisms
STYLE: Clear, articulate, suitable for formal and academic contexts
NEGATION: Use لا، لم، لن for negation according to tense`,
    
    egyptian: `VARIETY: Egyptian Arabic (مصري)
GRAMMAR: Egyptian verb conjugations, use "ب-" prefix for present continuous
NEGATION: Use "مش" before verbs/adjectives, "ما...ش" around verbs for emphasis
VOCABULARY: Egyptian vocabulary (e.g., عايز not أريد, ازاي not كيف, كده not هكذا)
QUESTIONS: Use "إيه" for "what", "ليه" for "why", "فين" for "where"
STYLE: Warm, relatable, natural Egyptian conversational flow`,
    
    gulf: `VARIETY: Gulf Arabic (خليجي - UAE/Saudi/Qatar/Kuwait)
GRAMMAR: Gulf verb forms, use future marker "ب-" or "راح"
VOCABULARY: Gulf vocabulary (e.g., شلون/شلونك, وش for "what", أبي/ابغى for "want")
PRONOUNS: Use "-ج" suffix for feminine second person (e.g., شلونج)
NEGATION: Use "ما" before verbs
STYLE: Polite, hospitable, use تفضل and mashallah naturally`,
    
    levantine: `VARIETY: Levantine Arabic (شامي - Syrian/Lebanese/Palestinian/Jordanian)
GRAMMAR: Levantine conjugations, use "ب-" for present, "رح" for future
VOCABULARY: Levantine vocabulary (e.g., شو for "what", هلق/هلأ for "now", كتير for "very")
PRONOUNS: Use "-ك" for masculine, "-كي" for feminine second person
NEGATION: Use "ما" before verbs, "مش" before nouns/adjectives
STYLE: Friendly, expressive, natural Levantine conversational tone`,
    
    maghrebi: `VARIETY: Maghrebi Arabic (مغاربي - Moroccan/Algerian/Tunisian)
GRAMMAR: Maghrebi verb forms, distinctive consonant clusters
VOCABULARY: Maghrebi vocabulary (e.g., واش for "what", بزاف for "very", ديال for possession)
FRENCH INFLUENCE: Natural French loanwords acceptable in context
NEGATION: Use "ما...ش" pattern (e.g., ما عرفتش)
STYLE: Direct, warm, use local expressions naturally`,
  };

  let instructions = dialectRules[dialect] || dialectRules.msa;

  // Add formality rules with more nuance
  if (options.formality === 'formal') {
    instructions += `\nTONE: Formal and respectful. Use complete sentences, proper grammar.
- Use honorifics (حضرتك، سعادتكم) when appropriate
- Avoid slang or very casual expressions
- Maintain professional distance while being warm`;
  } else {
    instructions += `\nTONE: Casual and conversational. Natural flow, friendly.
- Use contractions and natural speech patterns
- Include appropriate filler words for authenticity
- Be warm and approachable`;
  }

  // Code-switching rules with practical guidance
  if (options.codeSwitch === 'arabic_only') {
    instructions += `\nCODE-SWITCHING: Arabic only. Translate all technical terms if possible.
- Use Arabic equivalents for common English terms
- If no Arabic equivalent exists, transliterate with Arabic explanation`;
  } else {
    instructions += `\nCODE-SWITCHING: Natural mixing allowed for technical terms.
- Keep technical terms, brand names, and code in English/original
- Maintain natural bilingual flow for educated Arabic speakers`;
  }

  // Numeral mode rules
  if (options.numeralMode === 'arabic') {
    instructions += `\nNUMERALS: Use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) in prose.
- Exception: Keep Western numerals in code, URLs, and technical content`;
  }

  return instructions;
}

// =============================================================================
// DIRECT PROVIDER API CALLS - No third-party gateways
// =============================================================================

/**
 * Call OpenAI API directly
 */
async function callOpenAI(messages: Message[], modelId: string, maxTokens: number): Promise<Response> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[modelId];
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
  
  console.log(`Calling OpenAI directly with model: ${modelConfig.actualModel}`);
  
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelConfig.actualModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_completion_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
}

/**
 * Call Google Gemini API directly
 */
async function callGoogle(messages: Message[], modelId: string, maxTokens: number): Promise<Response> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[modelId];
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
  
  console.log(`Calling Google Gemini directly with model: ${modelConfig.actualModel}`);
  
  // Convert messages to Gemini format
  const systemMsg = messages.find(m => m.role === 'system');
  const conversationMsgs = messages.filter(m => m.role !== 'system');
  
  const geminiContents = conversationMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.actualModel}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
        generationConfig: {
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );
}

/**
 * Call Anthropic Claude API directly
 */
async function callAnthropic(messages: Message[], modelId: string, maxTokens: number): Promise<Response> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[modelId];
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
  
  console.log(`Calling Anthropic directly with model: ${modelConfig.actualModel}`);
  
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
      max_tokens: maxTokens,
      system: systemMessage,
      messages: conversationMessages,
      stream: true,
    }),
  });
}

/**
 * Call Thaura AI API directly (OpenAI-compatible)
 */
async function callThaura(messages: Message[], modelId: string, maxTokens: number): Promise<Response> {
  const apiKey = Deno.env.get('THAURA_API_KEY');
  if (!apiKey) throw new Error('THAURA_API_KEY not configured');
  
  const modelConfig = MODEL_REGISTRY[modelId];
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
  
  console.log(`Calling Thaura directly with model: ${modelConfig.actualModel}`);
  
  return fetch('https://backend.thaura.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelConfig.actualModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
}

/**
 * Get configured providers status
 */
function getConfiguredProviders(): { openai: boolean; google: boolean; anthropic: boolean; thaura: boolean } {
  return {
    openai: !!Deno.env.get('OPENAI_API_KEY'),
    google: !!Deno.env.get('GOOGLE_API_KEY'),
    anthropic: !!Deno.env.get('ANTHROPIC_API_KEY'),
    thaura: !!Deno.env.get('THAURA_API_KEY'),
  };
}

/**
 * Call the appropriate provider based on model configuration
 */
async function callProvider(messages: Message[], modelId: string, maxTokens: number): Promise<Response> {
  const modelConfig = MODEL_REGISTRY[modelId];
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
  
  switch (modelConfig.provider) {
    case 'openai':
      return callOpenAI(messages, modelId, maxTokens);
    case 'google':
      return callGoogle(messages, modelId, maxTokens);
    case 'anthropic':
      return callAnthropic(messages, modelId, maxTokens);
    case 'thaura':
      return callThaura(messages, modelId, maxTokens);
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

/**
 * Transform Google Gemini SSE stream to OpenAI-compatible format
 */
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
                  const openaiFormat = {
                    choices: [{ delta: { content: text } }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                }
              } catch {
                // Ignore parse errors
              }
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

/**
 * Transform Anthropic SSE stream to OpenAI-compatible format
 */
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
                  const openaiFormat = {
                    choices: [{ delta: { content: json.delta.text } }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                }
              } catch {
                // Ignore parse errors
              }
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

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface DialectOptions {
  formality?: 'formal' | 'casual';
  codeSwitch?: 'arabic_only' | 'mixed';
  numeralMode?: 'western' | 'arabic';
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
  dialect_options?: DialectOptions;
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

    // Check that at least one AI provider is configured
    const providers = getConfiguredProviders();
    if (!providers.openai && !providers.google && !providers.anthropic && !providers.thaura) {
      console.error('No AI providers configured');
      return new Response(
        JSON.stringify({ 
          error: 'No AI providers configured',
          error_code: 'NO_PROVIDERS',
          message_ar: 'لم يتم تكوين أي مزود ذكاء اصطناعي. يرجى التحقق من إعدادات API.',
          message_en: 'No AI providers configured. Please check your API settings.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      messages, 
      mode = 'fast', 
      project_id,
      conversation_id,
      system_instructions, 
      memory_context,
      dialect = 'msa',
      model,
      dialect_options = {}
    }: ChatRequest = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // ═══════════════════════════════════════════════════════════════
    // SERVER-SIDE BUDGET ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════
    
    // Fetch user profile with budget settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_budget, session_warning_threshold, credit_balance, credit_limit')
      .eq('id', user.id)
      .single();

    const dailyBudget = profile?.daily_budget ?? 5.00;
    const creditLimit = profile?.credit_limit ?? 100.00;
    const creditBalance = profile?.credit_balance ?? 0;

    // Check daily spending
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStats } = await supabase
      .from('usage_stats')
      .select('total_cost')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const dailySpending = todayStats?.total_cost ?? 0;

    // HARD LIMIT: Daily budget exceeded
    if (dailySpending >= dailyBudget) {
      console.warn(`Budget exceeded for user ${user.id}: daily spending $${dailySpending} >= budget $${dailyBudget}`);
      return new Response(
        JSON.stringify({ 
          error: 'Daily budget exceeded',
          error_code: 'DAILY_BUDGET_EXCEEDED',
          details: {
            daily_spending: dailySpending,
            daily_budget: dailyBudget,
            message_ar: 'تم تجاوز الميزانية اليومية. يرجى المحاولة غداً أو زيادة الميزانية في الإعدادات.',
            message_en: 'Daily budget exceeded. Please try again tomorrow or increase your budget in settings.'
          }
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // HARD LIMIT: Credit limit exceeded  
    if (creditBalance >= creditLimit) {
      console.warn(`Credit limit exceeded for user ${user.id}: balance $${creditBalance} >= limit $${creditLimit}`);
      return new Response(
        JSON.stringify({ 
          error: 'Credit limit exceeded',
          error_code: 'CREDIT_LIMIT_EXCEEDED',
          details: {
            credit_balance: creditBalance,
            credit_limit: creditLimit,
            message_ar: 'تم الوصول إلى الحد الائتماني. يرجى مراجعة الاستخدام.',
            message_en: 'Credit limit reached. Please review your usage.'
          }
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check project budget if project_id provided
    let projectBudgetWarning = false;
    if (project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('budget_limit, name')
        .eq('id', project_id)
        .single();

      if (project?.budget_limit) {
        // Get project spending from conversations
        const { data: projectConversations } = await supabase
          .from('conversations')
          .select('total_cost')
          .eq('project_id', project_id)
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const projectSpending = projectConversations?.reduce((sum, c) => sum + (c.total_cost || 0), 0) ?? 0;

        if (projectSpending >= project.budget_limit) {
          console.warn(`Project budget exceeded for ${project.name}: $${projectSpending} >= $${project.budget_limit}`);
          return new Response(
            JSON.stringify({ 
              error: 'Project budget exceeded',
              error_code: 'PROJECT_BUDGET_EXCEEDED',
              details: {
                project_name: project.name,
                project_spending: projectSpending,
                project_budget: project.budget_limit,
                message_ar: `تم تجاوز ميزانية المشروع "${project.name}".`,
                message_en: `Project "${project.name}" budget exceeded.`
              }
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Soft warning if approaching limit (80%)
        if (projectSpending >= project.budget_limit * 0.8) {
          projectBudgetWarning = true;
          console.log(`Project budget warning for ${project.name}: $${projectSpending} approaching $${project.budget_limit}`);
        }
      }
    }

    // Log budget check passed
    console.log(`Budget check passed for user ${user.id}: daily $${dailySpending}/$${dailyBudget}, credit $${creditBalance}/$${creditLimit}`);

    // Merge project dialect options if available
    let projectDialectOptions = { ...dialect_options };
    if (project_id) {
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select('dialect_formality, code_switch_mode, numeral_mode')
          .eq('id', project_id)
          .single();
        
        if (projectData) {
          projectDialectOptions = {
            formality: projectData.dialect_formality || dialect_options.formality || 'casual',
            codeSwitch: projectData.code_switch_mode || dialect_options.codeSwitch || 'mixed',
            numeralMode: projectData.numeral_mode || dialect_options.numeralMode || 'western',
          };
        }
      } catch (e) {
        console.warn('Could not fetch project dialect options:', e);
      }
    }

    // Determine model: use provided model, or fetch user default, or fallback
    let selectedModel = model;
    
    if (!selectedModel) {
      try {
        const { data: userSettings } = await supabase
          .from('user_model_settings')
          .select('default_chat_model')
          .eq('user_id', user.id)
          .single();
        
        if (userSettings?.default_chat_model) {
          selectedModel = userSettings.default_chat_model;
          console.log('Using user default model from settings:', selectedModel);
        }
      } catch (e) {
        console.warn('Could not fetch user model settings:', e);
      }
    }
    
    // Final fallback - use first available provider's model
    if (!selectedModel) {
      selectedModel = 'google/gemini-flash-3';
    }
    
    // Validate model exists in registry, or use fallback
    let modelConfig = MODEL_REGISTRY[selectedModel];
    if (!modelConfig) {
      console.warn(`Unknown model ${selectedModel}, falling back to gemini-flash-3`);
      selectedModel = 'google/gemini-flash-3';
      modelConfig = MODEL_REGISTRY[selectedModel];
    }
    
    // Check if the provider for this model is available
    if (!providers[modelConfig.provider]) {
      // Find first available model
      const availableModel = Object.entries(MODEL_REGISTRY).find(([_, cfg]) => providers[cfg.provider]);
      if (availableModel) {
        console.log(`Provider ${modelConfig.provider} not available, falling back to ${availableModel[0]}`);
        selectedModel = availableModel[0];
        modelConfig = MODEL_REGISTRY[selectedModel];
      } else {
        throw new Error('No AI providers available');
      }
    }
    
    // Get max tokens from model config or use mode-based calculation
    const reasoningEffort = REASONING_EFFORT[mode] || 'none';
    let maxCompletionTokens = modelConfig.maxTokens || 4096;

    if (reasoningEffort === 'medium') {
      maxCompletionTokens = 4096;
    } else if (reasoningEffort === 'high') {
      maxCompletionTokens = 16384;
    }

    // Handle "auto" dialect detection with improved accuracy
    let effectiveDialect = dialect;
    let dialectDetectionResult = { dialect: 'msa', confidence: 'none', markers: [] as string[], score: 0 };
    
    if (dialect === 'auto') {
      // Combine all user messages for detection
      const userText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
      dialectDetectionResult = detectDialectFromText(userText);
      
      // Apply detected dialect if confidence is high OR medium (improved sensitivity)
      if (dialectDetectionResult.confidence === 'high' || dialectDetectionResult.confidence === 'medium') {
        effectiveDialect = dialectDetectionResult.dialect;
        console.log(`Auto dialect detection: ${dialectDetectionResult.dialect} (confidence: ${dialectDetectionResult.confidence}, score: ${dialectDetectionResult.score}, markers: ${dialectDetectionResult.markers.join(', ')})`);
      } else {
        effectiveDialect = 'msa'; // Fall back to MSA for low/no confidence
        console.log(`Auto dialect: ${dialectDetectionResult.confidence} confidence (score: ${dialectDetectionResult.score}), falling back to MSA`);
      }
    }
    
    // Build processing metadata for logging
    const processingMetadata = {
      processing_version: 'v1',
      dialect_requested: dialect,
      dialect_used: effectiveDialect,
      dialect_confidence: dialectDetectionResult.confidence,
      formality: projectDialectOptions.formality || 'casual',
      code_switch: projectDialectOptions.codeSwitch || 'mixed',
      numeral_mode: projectDialectOptions.numeralMode || 'western',
    };

    console.log(`Chat request - Mode: ${mode}, Model: ${selectedModel}, Dialect: ${effectiveDialect}, Processing: ${JSON.stringify(processingMetadata)}, Messages: ${messages.length}`);

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

    // Build base system prompt with model identity
    const modelInfo = MODEL_DISPLAY_NAMES[selectedModel] || { displayName: 'AI Assistant', displayNameAr: 'مساعد ذكي' };
    
    let systemContent = `You are ${modelInfo.displayName} (${modelInfo.displayNameAr}), a helpful and intelligent AI assistant provided through AI Workspace.

IDENTITY RULES (CRITICAL):
- When asked "who are you?", "what model are you?", or similar identity questions, respond that you are "${modelInfo.displayName}" (${modelInfo.displayNameAr}).
- NEVER claim to be GPT-4, ChatGPT, Claude, Gemini, or any other model unless that is your actual identity.
- You are specifically ${modelInfo.displayName}, not a generic AI.

Key behaviors:
- Be concise but thorough
- Use markdown formatting when helpful
- Cite sources when making factual claims
- Admit uncertainty when you don't know something`;

    // Add dialect-specific instructions using enhanced function
    const dialectInstruction = buildDialectInstructions(effectiveDialect, projectDialectOptions);
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

    // ==========================================================================
    // DIRECT PROVIDER API CALL - No third-party gateways
    // ==========================================================================
    
    console.log(`Calling provider ${modelConfig.provider} with model ${selectedModel}`);
    
    let response: Response;
    try {
      response = await callProvider(allMessages, selectedModel, maxCompletionTokens);
    } catch (providerError) {
      console.error('Provider call failed:', providerError);
      return new Response(
        JSON.stringify({ 
          error: 'AI provider error',
          message_ar: 'حدث خطأ في مزود الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.',
          message_en: providerError instanceof Error ? providerError.message : 'Unknown error'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${modelConfig.provider} API error:`, response.status, errorText);
      
      // Handle specific error codes
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            message_ar: 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid API key configuration.',
            message_ar: 'خطأ في تكوين مفتاح API.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`${modelConfig.provider} API error: ${response.status}`);
    }
    
    // Transform stream based on provider (to OpenAI-compatible format)
    let streamBody: ReadableStream;
    if (modelConfig.provider === 'google') {
      streamBody = transformGoogleStream(response);
    } else if (modelConfig.provider === 'anthropic') {
      streamBody = transformAnthropicStream(response);
    } else {
      // OpenAI and Thaura already use compatible format
      streamBody = response.body!;
    }

    // Parse the stream to extract usage and pass through to client
    const originalReader = streamBody.getReader();
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
              
              // Calculate cost using model-specific pricing or default
              const pricingConfig = COST_PER_1M[selectedModel] || { input: 1.0, output: 4.0 };
              const modelPricing = pricingConfig as { input: number; output: number };

              const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
              const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
              const totalCost = inputCost + outputCost;
              
              console.log(`Usage - Model: ${selectedModel}, Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${totalCost.toFixed(6)}`);

              // Record individual usage event with processing metadata
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
                    reasoning_effort: reasoningEffort,
                    // Processing metadata for QA and analytics
                    ...processingMetadata
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
