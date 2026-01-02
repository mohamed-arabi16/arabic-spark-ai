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
    const { start_date, end_date } = await req.json()

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

    // Get the user from the token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Fetch usage stats for the authenticated user
    const { data: dailyStats, error: statsError } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: true });

    if (statsError) throw statsError

    // Calculate totals
    const totalTokens = dailyStats.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
    const totalCost = dailyStats.reduce((acc, curr) => acc + (curr.total_cost || 0), 0);
    const totalImages = dailyStats.reduce((acc, curr) => acc + (curr.image_count || 0), 0);
    const totalMessages = dailyStats.reduce((acc, curr) => acc + (curr.message_count || 0), 0);

    // Mocking breakdown by model
    const breakdown = [
        { model: 'gpt-5-mini', tokens: Math.floor(totalTokens * 0.7), cost: totalCost * 0.4 },
        { model: 'gpt-5', tokens: Math.floor(totalTokens * 0.25), cost: totalCost * 0.5 },
        { model: 'gpt-image-1', tokens: 0, cost: totalCost * 0.1 }
    ];

    return new Response(
      JSON.stringify({
        daily_stats: dailyStats,
        summary: {
            total_tokens: totalTokens,
            total_cost: totalCost,
            total_images: totalImages,
            total_messages: totalMessages
        },
        breakdown
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
