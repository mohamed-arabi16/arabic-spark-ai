import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, project_id } = await req.json()

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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get the user from the token to verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Analyze conversation to extract facts (Mock logic)
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    let extractedFacts = [];

    if (content.includes('my name is')) {
      extractedFacts.push({
        content: `User's name is ${content.split('my name is')[1].trim()}`,
        category: 'fact',
        confidence: 0.9
      });
    }

    if (content.includes('i prefer') || content.includes('i like')) {
      extractedFacts.push({
        content: `User preference: ${content}`,
        category: 'preference',
        confidence: 0.85
      });
    }

    // If no specific pattern, just mock one occasionally for demo purposes
    if (extractedFacts.length === 0 && Math.random() > 0.7) {
       extractedFacts.push({
        content: `Extracted fact from conversation context`,
        category: 'fact',
        confidence: 0.7
      });
    }

    return new Response(
      JSON.stringify({ facts: extractedFacts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
