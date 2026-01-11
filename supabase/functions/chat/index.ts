import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Model display name registry for AI identity
const MODEL_DISPLAY_NAMES: Record<string, { displayName: string; displayNameAr: string }> = {
  'google/gemini-2.5-flash': { displayName: 'Gemini Flash', displayNameAr: 'جيميني فلاش' },
  'google/gemini-2.5-pro': { displayName: 'Gemini Pro', displayNameAr: 'جيميني برو' },
  'google/gemini-3-pro-preview': { displayName: 'Gemini 3 Pro', displayNameAr: 'جيميني 3 برو' },
  'openai/gpt-5': { displayName: 'GPT-5', displayNameAr: 'جي بي تي 5' },
  'openai/gpt-5-mini': { displayName: 'GPT-5 Mini', displayNameAr: 'جي بي تي 5 ميني' },
  'openai/gpt-5-nano': { displayName: 'GPT-5 Nano', displayNameAr: 'جي بي تي 5 نانو' },
  'anthropic/claude-3-5-haiku-latest': { displayName: 'Claude Haiku', displayNameAr: 'كلود هايكو' },
  'anthropic/claude-sonnet-4-5': { displayName: 'Claude Sonnet', displayNameAr: 'كلود سونيت' },
  'thaura/thaura': { displayName: 'Thaura', displayNameAr: 'ثورة' },
};

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

// Dialect detection markers for auto mode
const DIALECT_MARKERS: Record<string, RegExp> = {
  egyptian: /إيه|عايز|كده|ازيك|ازاي|ليه|مش|ده|دي|بتاع|طب|اوي|كمان/g,
  gulf: /شلونك|وش|هالحين|أبي|ابي|يالله|زين|حده|اشوفك|ابغى|كذا|وايد/g,
  levantine: /هلق|هلأ|شو|بدي|كيفك|هيك|منيح|بعدين|ليش|هاد|كتير/g,
  maghrebi: /واش|راك|بغيت|لاباس|كيداير|زوين|بزاف|ماشي|كيفاش/g,
};

// Detect dialect from text with confidence
function detectDialectFromText(text: string): { dialect: string; confidence: string; markers: string[] } {
  const foundMarkers: Record<string, string[]> = {};
  
  for (const [dialect, pattern] of Object.entries(DIALECT_MARKERS)) {
    const matches = text.match(pattern);
    if (matches) {
      foundMarkers[dialect] = [...new Set(matches)];
    }
  }
  
  let topDialect = 'msa';
  let maxMarkers = 0;
  let markers: string[] = [];
  
  for (const [dialect, found] of Object.entries(foundMarkers)) {
    if (found.length > maxMarkers) {
      maxMarkers = found.length;
      topDialect = dialect;
      markers = found;
    }
  }
  
  let confidence = 'none';
  if (maxMarkers >= 3) confidence = 'high';
  else if (maxMarkers === 2) confidence = 'medium';
  else if (maxMarkers === 1) confidence = 'low';
  
  return { dialect: topDialect, confidence, markers };
}

// Build dialect instructions with structured rules (no example expressions)
function buildDialectInstructions(dialect: string, options: { formality?: string; codeSwitch?: string; numeralMode?: string } = {}): string {
  const dialectRules: Record<string, string> = {
    msa: `VARIETY: Modern Standard Arabic (الفصحى)
GRAMMAR: Classical Arabic grammar, case endings optional
VOCABULARY: Formal register, avoid colloquialisms`,
    
    egyptian: `VARIETY: Egyptian Arabic
GRAMMAR: Egyptian verb conjugations, negation with مش
VOCABULARY: Egyptian vocabulary`,
    
    gulf: `VARIETY: Gulf Arabic (UAE/Saudi/Qatar)
GRAMMAR: Gulf verb forms
VOCABULARY: Gulf vocabulary`,
    
    levantine: `VARIETY: Levantine Arabic (Syrian/Lebanese/Palestinian)
GRAMMAR: Levantine conjugations
VOCABULARY: Levantine vocabulary`,
    
    maghrebi: `VARIETY: Maghrebi Arabic (Moroccan/Algerian/Tunisian)
GRAMMAR: Maghrebi verb forms
VOCABULARY: Maghrebi vocabulary`,
  };

  let instructions = dialectRules[dialect] || dialectRules.msa;

  // Formality rule
  instructions += `\nTONE: ${
    options.formality === 'formal' 
      ? 'Formal, respectful. Complete sentences, proper grammar.' 
      : 'Casual, conversational. Natural flow, friendly.'
  }`;

  // Code-switch rule
  instructions += `\nCODE-SWITCHING: ${
    options.codeSwitch === 'arabic_only' 
      ? 'Arabic only. Translate technical terms if possible.' 
      : 'Natural code-switching allowed for technical terms.'
  }`;

  // Numeral rule
  if (options.numeralMode === 'arabic') {
    instructions += `\nNUMERALS: Use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩)`;
  }

  return instructions;
}

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
    
    // Final fallback
    selectedModel = selectedModel || 'google/gemini-2.5-flash';

    // Determine reasoning effort and max tokens
    const reasoningEffort = REASONING_EFFORT[mode] || 'none';
    let maxCompletionTokens = 2048;

    if (reasoningEffort === 'medium') {
      maxCompletionTokens = 4096;
    } else if (reasoningEffort === 'high') {
      maxCompletionTokens = 16384;
    }

    // Handle "auto" dialect detection
    let effectiveDialect = dialect;
    let dialectDetectionResult = { dialect: 'msa', confidence: 'none', markers: [] as string[] };
    
    if (dialect === 'auto') {
      // Combine all user messages for detection
      const userText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
      dialectDetectionResult = detectDialectFromText(userText);
      
      // Only apply detected dialect if confidence is high
      if (dialectDetectionResult.confidence === 'high') {
        effectiveDialect = dialectDetectionResult.dialect;
        console.log(`Auto dialect detection: ${dialectDetectionResult.dialect} (confidence: ${dialectDetectionResult.confidence}, markers: ${dialectDetectionResult.markers.join(', ')})`);
      } else {
        effectiveDialect = 'msa'; // Fall back to MSA
        console.log(`Auto dialect: low confidence, falling back to MSA`);
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
