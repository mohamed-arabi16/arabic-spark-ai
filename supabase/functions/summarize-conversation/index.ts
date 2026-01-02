import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    if (!lovableApiKey) {
      throw new Error('AI API key not configured')
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

Respond with ONLY the summary text, no preamble or explanation.`;

    console.log('Generating conversation summary...');

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Summary generation failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content || '';

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
