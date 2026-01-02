import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface Message {
  role: string;
  content: string;
}

interface ExtractedFact {
  type: string;
  key: string;
  value: string;
  confidence: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, project_id, conversation_id } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required')
    }

    // Initialize Supabase client with request auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('AI API key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get the user from the token to verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Build extraction prompt
    const conversationText = messages
      .map((m: Message) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const extractionPrompt = `Analyze the following conversation and extract any stable, reusable facts about the user that would be helpful to remember for future conversations.

ONLY extract:
- User preferences ("I prefer...", "I like...", "I always...")
- Identity/professional facts ("I am a...", "My name is...", "I work at...")
- Project constraints ("The client wants...", "Use formal tone...", "This is for...")
- Recurring patterns or instructions ("Always include...", "Remember to...")
- Language/dialect preferences ("Respond in Arabic", "Use Levantine dialect")

DO NOT extract:
- One-time queries or questions
- Temporary information
- Sensitive personal data (passwords, addresses, phone numbers)
- Information that seems confidential

For each fact, assess your confidence (0.0 to 1.0) based on how explicitly the user stated it.

CONVERSATION:
${conversationText}

Respond with a JSON array of extracted facts. If no facts are found, return an empty array.
Each fact should have:
- type: "preference" | "fact" | "instruction" | "constraint" | "identity"
- key: A short label (2-4 words)
- value: The actual information to remember
- confidence: Number between 0 and 1
- reason: Brief explanation of why this was extracted

Example response:
[
  {
    "type": "preference",
    "key": "Language preference",
    "value": "User prefers responses in Levantine Arabic dialect",
    "confidence": 0.95,
    "reason": "User explicitly stated dialect preference"
  }
]`;

    console.log('Calling Lovable AI for memory extraction...');

    // Call Lovable AI for extraction
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', facts: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI extraction failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI extraction response:', content.substring(0, 200));

    // Parse the JSON response
    let extractedFacts: ExtractedFact[] = [];
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedFacts = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse extraction response:', parseError);
      extractedFacts = [];
    }

    // Filter out low confidence extractions
    extractedFacts = extractedFacts.filter(f => f.confidence >= 0.6);

    // Save extracted facts to database as "proposed" status
    const savedFacts = [];
    for (const fact of extractedFacts) {
      try {
        const { data, error } = await supabase
          .from('memory_objects')
          .insert({
            user_id: user.id,
            project_id: project_id || null,
            content: fact.value,
            category: fact.type,
            type: fact.type,
            key: fact.key,
            confidence: fact.confidence,
            status: 'proposed',
            source_conversation_id: conversation_id || null,
            is_global: !project_id,
            is_active: true,
          })
          .select()
          .single();

        if (!error && data) {
          savedFacts.push({
            ...data,
            reason: fact.reason,
          });
        }
      } catch (insertError) {
        console.error('Failed to save memory:', insertError);
      }
    }

    console.log(`Extracted ${extractedFacts.length} facts, saved ${savedFacts.length}`);

    return new Response(
      JSON.stringify({ 
        facts: savedFacts,
        extracted_count: extractedFacts.length,
        saved_count: savedFacts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Memory extraction error:', message);
    return new Response(
      JSON.stringify({ error: message, facts: [] }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
