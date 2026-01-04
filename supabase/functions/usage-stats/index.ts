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

    // RECONCILIATION: Aggregate directly from usage_events to ensure truthfulness
    // This replaces the reliance on pre-aggregated usage_stats table for the dashboard

    // Fetch all usage events for the period
    const { data: events, error: eventsError } = await supabase
      .from('usage_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', `${start_date}T00:00:00Z`)
      .lte('created_at', `${end_date}T23:59:59Z`)
      .order('created_at', { ascending: true });

    if (eventsError) throw eventsError;

    // Calculate daily stats on the fly
    const dailyStatsMap = new Map<string, {
      date: string;
      total_tokens: number;
      total_cost: number;
      message_count: number;
      image_count: number;
    }>();

    // Calculate model breakdown on the fly
    const breakdownMap = new Map<string, { tokens: number; cost: number }>();

    let totalTokens = 0;
    let totalCost = 0;
    let totalImages = 0;
    let totalMessages = 0;

    events?.forEach((event: any) => {
        const date = event.created_at.split('T')[0];

        // Update daily stats
        if (!dailyStatsMap.has(date)) {
            dailyStatsMap.set(date, {
                date,
                total_tokens: 0,
                total_cost: 0,
                message_count: 0,
                image_count: 0
            });
        }
        const daily = dailyStatsMap.get(date)!;
        daily.total_tokens += event.total_tokens || 0;
        daily.total_cost += event.cost || 0;

        if (event.request_type === 'image') {
            daily.image_count += 1;
            totalImages += 1;
        } else {
            daily.message_count += 1;
            totalMessages += 1;
        }

        // Update totals
        totalTokens += event.total_tokens || 0;
        totalCost += event.cost || 0;

        // Update model breakdown
        const model = event.model_id || 'unknown';
        const modelStat = breakdownMap.get(model) || { tokens: 0, cost: 0 };
        modelStat.tokens += event.total_tokens || 0;
        modelStat.cost += event.cost || 0;
        breakdownMap.set(model, modelStat);
    });

    const dailyStats = Array.from(dailyStatsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const breakdown = Array.from(breakdownMap.entries()).map(([model, stats]) => ({
      model,
      tokens: stats.tokens,
      cost: stats.cost
    }));

    // Fallback if no data
    if (breakdown.length === 0 && totalTokens > 0) {
      breakdown.push({ model: 'gpt-5.2', tokens: totalTokens, cost: totalCost });
    }

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
