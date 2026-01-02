import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model routing based on mode
const MODEL_MAP: Record<string, string> = {
  fast: 'gpt-5-mini-2025-08-07',
  standard: 'gpt-5-mini-2025-08-07',
  deep: 'gpt-5-2025-08-07',
  research: 'gpt-5-2025-08-07',
  image: 'gpt-5-mini-2025-08-07', // Image generation uses a different endpoint
};

// Cost per 1M tokens (approximate)
const COST_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-5-mini-2025-08-07': { input: 0.25, output: 2.00 },
  'gpt-5-2025-08-07': { input: 1.75, output: 14.00 },
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  mode: string;
  systemPrompt?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OpenAI API key not configured');
    }

    const { messages, mode = 'fast', systemPrompt }: ChatRequest = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const model = MODEL_MAP[mode] || MODEL_MAP.fast;
    console.log(`Chat request - Mode: ${mode}, Model: ${model}, Messages: ${messages.length}`);

    // Build messages with system prompt
    const systemMessage: Message = {
      role: 'system',
      content: systemPrompt || `You are a helpful, intelligent AI assistant. You provide clear, accurate, and thoughtful responses.

Key behaviors:
- Be concise but thorough
- Use markdown formatting when helpful
- If asked about Arabic topics, respond naturally in Arabic when appropriate
- Cite sources when making factual claims
- Admit uncertainty when you don't know something`,
    };

    const allMessages = [systemMessage, ...messages];

    // Make request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_completion_tokens: mode === 'deep' ? 4096 : 2048,
        stream: true,
      }),
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
