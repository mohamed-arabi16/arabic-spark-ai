/**
 * Health Check Edge Function
 * 
 * Returns status of various system components for monitoring.
 * Checks database connectivity and AI provider availability.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const checks: Record<string, { status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs?: number; error?: string }> = {};

  // Check database connectivity
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const dbStart = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const dbLatency = Date.now() - dbStart;
    
    if (error) {
      checks.database = { status: 'unhealthy', latencyMs: dbLatency, error: error.message };
    } else {
      checks.database = { 
        status: dbLatency < 1000 ? 'healthy' : 'degraded', 
        latencyMs: dbLatency 
      };
    }
  } catch (err) {
    checks.database = { 
      status: 'unhealthy', 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }

  // Check if required environment variables are set
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  // Direct AI provider keys (no third-party gateways)
  const aiProviderVars = ['OPENAI_API_KEY', 'GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'THAURA_API_KEY'];
  const optionalEnvVars = ['PERPLEXITY_API_KEY', 'ELEVENLABS_API_KEY'];
  
  const envStatus: Record<string, boolean> = {};
  let allRequiredPresent = true;
  
  for (const envVar of requiredEnvVars) {
    const isPresent = !!Deno.env.get(envVar);
    envStatus[envVar] = isPresent;
    if (!isPresent) allRequiredPresent = false;
  }
  
  for (const envVar of [...aiProviderVars, ...optionalEnvVars]) {
    envStatus[envVar] = !!Deno.env.get(envVar);
  }
  
  checks.environment = {
    status: allRequiredPresent ? 'healthy' : 'unhealthy',
  };

  // Check AI provider availability (direct providers only, no third-party gateways)
  const aiProviders: Record<string, boolean> = {
    openai: !!Deno.env.get('OPENAI_API_KEY'),
    google: !!Deno.env.get('GOOGLE_API_KEY'),
    anthropic: !!Deno.env.get('ANTHROPIC_API_KEY'),
    thaura: !!Deno.env.get('THAURA_API_KEY'),
    perplexity: !!Deno.env.get('PERPLEXITY_API_KEY'),
  };
  
  const anyAiProvider = aiProviders.openai || aiProviders.google || aiProviders.anthropic;
  checks.ai_providers = {
    status: anyAiProvider ? 'healthy' : 'unhealthy',
  };

  // Calculate overall status
  const statuses = Object.values(checks).map(c => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (statuses.includes('unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  const totalLatency = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: Deno.env.get('FUNCTION_VERSION') || '2.0.0',
    checks,
    providers: aiProviders,
    environment: envStatus,
    latencyMs: totalLatency,
  };

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return new Response(JSON.stringify(response, null, 2), {
    status: httpStatus,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
