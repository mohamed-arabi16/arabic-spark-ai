/**
 * Extract Memory Edge Function
 * 
 * Analyzes conversations to extract stable, reusable facts about the user
 * that can be used to personalize future interactions.
 * 
 * Uses direct AI provider calls - NO third-party gateway services.
 * Implements semantic deduplication and sensitive data filtering.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

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
  temporal_relevance?: 'permanent' | 'long_term' | 'short_term';
}

interface ExistingMemory {
  content: string;
  key: string | null;
  category: string | null;
}

// =============================================================================
// DIRECT PROVIDER API CALLS
// =============================================================================

/**
 * Call Google Gemini API directly for memory extraction
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
          temperature: 0.2, // Low temperature for consistent extraction
          maxOutputTokens: 2048,
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
 * Call OpenAI API directly for memory extraction
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
      temperature: 0.2,
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
 * Call available AI provider for memory extraction
 */
async function extractWithAI(prompt: string): Promise<string> {
  // Try Google first (most cost-effective), then OpenAI
  if (Deno.env.get('GOOGLE_API_KEY')) {
    console.log('Using Google Gemini for memory extraction');
    return callGoogleGemini(prompt);
  }
  
  if (Deno.env.get('OPENAI_API_KEY')) {
    console.log('Using OpenAI for memory extraction');
    return callOpenAI(prompt);
  }
  
  throw new Error('No AI provider configured (GOOGLE_API_KEY or OPENAI_API_KEY required)');
}

// =============================================================================
// SEMANTIC SIMILARITY FOR DEDUPLICATION
// =============================================================================

/**
 * Calculate Jaccard similarity between two strings
 * Used for semantic deduplication of memories
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);
  
  return intersection.length / union.size;
}

/**
 * Check if a new fact is a duplicate of existing memories
 */
function isDuplicateFact(newFact: ExtractedFact, existingMemories: ExistingMemory[]): boolean {
  for (const existing of existingMemories) {
    // Check content similarity
    const contentSimilarity = calculateSimilarity(newFact.value, existing.content);
    if (contentSimilarity > 0.4) return true;
    
    // Check if key concepts match
    if (existing.key) {
      const keySimilarity = calculateSimilarity(newFact.key, existing.key);
      if (keySimilarity > 0.6) return true;
    }
  }
  return false;
}

// =============================================================================
// SENSITIVE DATA FILTERING
// =============================================================================

const SENSITIVE_PATTERNS = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // US phone
  /\+?\d{10,15}/, // International phone
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i, // Email
  /password\s*[:=]\s*\S+/i,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /secret\s*[:=]\s*\S+/i,
  /token\s*[:=]\s*\S+/i,
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, // SSN
  /\b(?:sk|pk)[-_](?:live|test)[-_]\w+\b/i, // Stripe keys
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, // AWS keys
  /\bey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/, // JWT tokens
];

/**
 * Check if text contains sensitive data
 */
function containsSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

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
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Check that at least one AI provider is available
    if (!Deno.env.get('GOOGLE_API_KEY') && !Deno.env.get('OPENAI_API_KEY')) {
      console.error('No AI providers configured for memory extraction');
      throw new Error('No AI provider configured')
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

CRITICAL: If you find a fact that is essentially the same as an existing memory (even if worded differently), DO NOT include it. Be very strict about avoiding duplicates.`
      : '';

    // Build enhanced extraction prompt with temporal relevance
    const conversationText = messages
      .map((m: Message) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const extractionPrompt = `You are an intelligent memory extraction system for an Arabic-first AI assistant.
Analyze the following conversation and extract STABLE, REUSABLE facts about the user.

=== EXTRACTION RULES ===

EXTRACT ONLY:
1. IDENTITY: Name, profession, company, role, expertise areas
2. PREFERENCES: Communication style, language/dialect preferences, formatting preferences
3. CONSTRAINTS: Project requirements, client expectations, deadlines, budget info
4. INSTRUCTIONS: Recurring requests, standing orders, workflow preferences
5. CONTEXT: Background info that helps personalize responses

DO NOT EXTRACT:
- One-time queries or temporary information
- Sensitive data: passwords, API keys, credit cards, SSN, phone numbers, email addresses
- Medical, financial, or confidential information
- Vague or uncertain statements
- Information already covered by existing memories

=== TEMPORAL RELEVANCE ===
For each fact, assess its temporal relevance:
- "permanent": Core identity, unlikely to change (name, profession)
- "long_term": Stable preferences, lasting months/years
- "short_term": Project-specific, may expire in weeks
${existingContext}

=== CONFIDENCE SCORING ===
- 0.9-1.0: Explicitly stated by user
- 0.7-0.89: Strongly implied from context
- 0.5-0.69: Reasonably inferred
- Below 0.5: Do not extract

=== CONVERSATION ===
${conversationText}

=== OUTPUT FORMAT ===
Respond with ONLY a JSON array. If no NEW, UNIQUE facts are found, return [].

Each fact object:
{
  "type": "identity" | "preference" | "instruction" | "constraint" | "context",
  "key": "Short descriptive label (2-4 words)",
  "value": "The actual fact to remember (be concise but complete)",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of why this was extracted",
  "temporal_relevance": "permanent" | "long_term" | "short_term"
}`;

    console.log('Calling AI for memory extraction...');

    // Call AI for extraction
    const content = await extractWithAI(extractionPrompt);
    
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

    // Filter out low confidence extractions (raised threshold for better quality)
    extractedFacts = extractedFacts.filter(f => f.confidence >= 0.65);

    // Filter out facts with sensitive data
    const beforeSensitiveFilter = extractedFacts.length;
    extractedFacts = extractedFacts.filter(fact => {
      const hasSensitive = containsSensitiveData(fact.value) || containsSensitiveData(fact.key);
      if (hasSensitive) {
        console.log(`Filtered sensitive memory: "${fact.key}" - contains sensitive data`);
      }
      return !hasSensitive;
    });

    if (beforeSensitiveFilter > extractedFacts.length) {
      console.log(`Filtered ${beforeSensitiveFilter - extractedFacts.length} facts containing sensitive data`);
    }

    // Enhanced semantic deduplication
    if (existingMemories && existingMemories.length > 0) {
      const beforeDedup = extractedFacts.length;
      extractedFacts = extractedFacts.filter(fact => {
        const isDuplicate = isDuplicateFact(fact, existingMemories as ExistingMemory[]);
        if (isDuplicate) {
          console.log(`Filtered duplicate memory: "${fact.key}"`);
        }
        return !isDuplicate;
      });
      
      if (beforeDedup > extractedFacts.length) {
        console.log(`Filtered ${beforeDedup - extractedFacts.length} duplicate facts`);
      }
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
            temporal_relevance: fact.temporal_relevance,
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
