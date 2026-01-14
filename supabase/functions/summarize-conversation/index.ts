/**
 * Summarize Conversation Edge Function
 * 
 * Auto-generates conversation summaries for context preservation.
 * Uses direct AI provider calls - NO third-party gateway services.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// DIRECT PROVIDER API CALLS
// =============================================================================

/**
 * Call Google Gemini API directly for summarization
 */
async function callGoogleGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Call OpenAI API directly for summarization
 */
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Call available AI provider for summarization
 */
async function summarizeWithAI(prompt: string): Promise<string> {
  // Try Google first (most cost-effective), then OpenAI
  if (Deno.env.get('GOOGLE_API_KEY')) {
    console.log('Using Google Gemini for summarization');
    return callGoogleGemini(prompt);
  }
  
  if (Deno.env.get('OPENAI_API_KEY')) {
    console.log('Using OpenAI for summarization');
    return callOpenAI(prompt);
  }
  
  throw new Error('No AI provider configured (GOOGLE_API_KEY or OPENAI_API_KEY required)');
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversation_id } = await req.json()

    if (!conversation_id) {
      throw new Error('conversation_id is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Check that at least one AI provider is available
    if (!Deno.env.get('GOOGLE_API_KEY') && !Deno.env.get('OPENAI_API_KEY')) {
      throw new Error('No AI provider configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Get the existing summary if any
    const { data: existingSummary } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch messages since last summary (or all if no summary)
    let messagesQuery = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (existingSummary?.last_summarized_message_id) {
      // Get the timestamp of the last summarized message
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', existingSummary.last_summarized_message_id)
        .single();

      if (lastMsg) {
        messagesQuery = messagesQuery.gt('created_at', lastMsg.created_at);
      }
    }

    const { data: newMessages, error: msgsError } = await messagesQuery;

    if (msgsError) throw msgsError;

    if (!newMessages || newMessages.length < 4) {
      return new Response(
        JSON.stringify({ 
          message: 'Not enough new messages to summarize',
          summary: existingSummary?.summary || null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation text
    const conversationText = newMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const previousSummary = existingSummary?.summary 
      ? `\nPREVIOUS SUMMARY:\n${existingSummary.summary}\n\n` 
      : '';

    const summaryPrompt = `Create a concise summary of this conversation that captures the key points, decisions, and any important context that should be preserved for future reference.
${previousSummary}
NEW MESSAGES TO INCORPORATE:
${conversationText}

Guidelines:
- Keep the summary under 500 words
- Focus on actionable information and key decisions
- Preserve any user preferences or requirements mentioned
- Note any unresolved questions or pending items
- If there's a previous summary, integrate the new information with it
- For Arabic conversations, keep the summary in Arabic

Respond with ONLY the summary text, no preamble or explanation.`;

    console.log('Generating conversation summary...');

    const summary = await summarizeWithAI(summaryPrompt);

    if (!summary) {
      throw new Error('No summary generated');
    }

    // Get the last message ID
    const lastMessageId = newMessages[newMessages.length - 1].id;

    // Save or update summary
    if (existingSummary) {
      const { error: updateError } = await supabase
        .from('conversation_summaries')
        .update({
          summary,
          last_summarized_message_id: lastMessageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSummary.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('conversation_summaries')
        .insert({
          conversation_id,
          user_id: user.id,
          summary,
          last_summarized_message_id: lastMessageId,
        });

      if (insertError) throw insertError;
    }

    console.log('Summary saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        summary,
        messages_summarized: newMessages.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Summarization error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
