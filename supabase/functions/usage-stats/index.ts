/**
 * Usage Stats Edge Function
 * 
 * Retrieves usage statistics for a user within a date range.
 * Returns daily aggregates, totals, and model breakdown.
 */
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

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    console.log(`Fetching usage stats for user ${user.id} from ${start_date} to ${end_date}`);

    // Query the usage_stats table for daily aggregates
    const { data: stats, error: statsError } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: true });

    if (statsError) {
      console.error('Error fetching usage_stats:', statsError);
      throw statsError;
    }

    console.log(`Found ${stats?.length || 0} usage_stats records`);

    // Query usage_events for detailed model breakdown
    const { data: events, error: eventsError } = await supabase
      .from('usage_events')
      .select('model_id, total_tokens, cost')
      .eq('user_id', user.id)
      .gte('created_at', `${start_date}T00:00:00Z`)
      .lte('created_at', `${end_date}T23:59:59Z`);

    // Build daily stats map
    const dailyStatsMap = new Map<string, {
      date: string;
      total_tokens: number;
      total_cost: number;
      message_count: number;
      image_count: number;
    }>();

    let totalTokens = 0;
    let totalCost = 0;
    let totalImages = 0;
    let totalMessages = 0;

    // Process usage_stats records
    stats?.forEach((stat: any) => {
      const date = stat.date;

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
      daily.total_tokens += stat.total_tokens || 0;
      daily.total_cost += stat.total_cost || 0;
      daily.message_count += stat.message_count || 0;
      daily.image_count += stat.image_count || 0;

      totalTokens += stat.total_tokens || 0;
      totalCost += stat.total_cost || 0;
      totalMessages += stat.message_count || 0;
      totalImages += stat.image_count || 0;
    });

    const dailyStats = Array.from(dailyStatsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Build model breakdown from usage_events if available
    const modelBreakdown: Record<string, { tokens: number; cost: number; count: number }> = {};
    
    if (!eventsError && events) {
      events.forEach((event: any) => {
        const modelId = event.model_id || 'unknown';
        if (!modelBreakdown[modelId]) {
          modelBreakdown[modelId] = { tokens: 0, cost: 0, count: 0 };
        }
        modelBreakdown[modelId].tokens += event.total_tokens || 0;
        modelBreakdown[modelId].cost += event.cost || 0;
        modelBreakdown[modelId].count += 1;
      });
    }

    const breakdown = Object.entries(modelBreakdown).map(([model, data]) => ({
      model,
      tokens: data.tokens,
      cost: data.cost,
      count: data.count,
    })).sort((a, b) => b.cost - a.cost);

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
    console.error('Usage stats error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
