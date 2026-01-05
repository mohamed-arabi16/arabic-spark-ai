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

interface ExistingMemory {
  content: string;
  key: string | null;
  category: string | null;
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

    // Fetch existing memories to prevent duplicates
    const { data: existingMemories } = await supabase
      .from('memory_objects')
      .select('content, key, category')
      .eq('user_id', user.id)
      .in('status', ['approved', 'proposed'])
      .eq('is_active', true);

    console.log(`Found ${existingMemories?.length || 0} existing memories for deduplication`);

    // Build existing memories context for the AI
    const existingContext = existingMemories && existingMemories.length > 0 
      ? `\n\nEXISTING MEMORIES (DO NOT extract facts that duplicate or are semantically similar to these):
${existingMemories.map((m: ExistingMemory) => `- [${m.category || 'general'}] ${m.key || 'info'}: ${m.content}`).join('\n')}

IMPORTANT: If you find a fact that is essentially the same as an existing memory (even if worded differently), DO NOT include it in your output.`
      : '';

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
- Facts that are too generic or obvious${existingContext}

For each fact, assess your confidence (0.0 to 1.0) based on how explicitly the user stated it.

CONVERSATION:
${conversationText}

Respond with a JSON array of extracted facts. If no NEW facts are found (that don't duplicate existing memories), return an empty array.
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

    // Additional deduplication check - compare with existing memories
    if (existingMemories && existingMemories.length > 0) {
      const existingContents = existingMemories.map((m: ExistingMemory) => m.content.toLowerCase());
      const existingKeys = existingMemories.map((m: ExistingMemory) => (m.key || '').toLowerCase());
      
      extractedFacts = extractedFacts.filter(fact => {
        const factValueLower = fact.value.toLowerCase();
        const factKeyLower = fact.key.toLowerCase();
        
        // Check if this fact is too similar to existing ones
        const isDuplicate = existingContents.some(existing => {
          // Simple similarity check - if significant overlap
          const words1 = new Set(existing.split(/\s+/).filter(w => w.length > 3));
          const words2 = new Set(factValueLower.split(/\s+/).filter(w => w.length > 3));
          const intersection = [...words1].filter(w => words2.has(w));
          const similarity = intersection.length / Math.max(words1.size, words2.size);
          return similarity > 0.5; // 50% word overlap = duplicate
        }) || existingKeys.some(key => key && factKeyLower.includes(key));
        
        if (isDuplicate) {
          console.log(`Filtered duplicate memory: "${fact.key}"`);
        }
        return !isDuplicate;
      });
    }

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
