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

const COST_PER_1M = {
  'gpt-5.2': {
    input: 2.50,
    output: 10.00,
    // Reasoning tokens may have different pricing
  },
  'gpt-image-1': { per_image: 0.04 }, // Image pricing
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  mode: string;
  project_id?: string;
  system_instructions?: string;
  memory_context?: string;
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

    const { messages, mode = 'fast', system_instructions, memory_context }: ChatRequest = await req.json();
    
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

    console.log(`Chat request - Mode: ${mode}, Model: ${TEXT_MODEL}, Reasoning: ${reasoningEffort}, Messages: ${messages.length}`);

    // Build base system prompt
    let systemContent = `You are a helpful, intelligent AI assistant. You provide clear, accurate, and thoughtful responses.

Key behaviors:
- Be concise but thorough
- Use markdown formatting when helpful
- If asked about Arabic topics, respond naturally in Arabic when appropriate
- Cite sources when making factual claims
- Admit uncertainty when you don't know something`;

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

    // Construct request body
    const requestBody: any = {
      model: TEXT_MODEL,
      messages: allMessages,
      reasoning_effort: reasoningEffort,
      max_completion_tokens: maxCompletionTokens,
      stream: true,
    };

    if (mode === 'research') {
      requestBody.tools = [{
        type: 'web_search_preview',
        search_context_size: 'medium',
      }];
    }

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

    // Stream the response back
    return new Response(response.body, {
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
