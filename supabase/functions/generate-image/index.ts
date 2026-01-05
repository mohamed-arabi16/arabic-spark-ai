import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, size = '1024x1024', conversation_id, negative_prompt, style } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY.')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    console.log(`Generating image for prompt: "${prompt.substring(0, 50)}..."`);

    // Construct the enhanced prompt for DALL-E 3
    let enhancedPrompt = prompt;

    if (style && style !== 'none') {
      enhancedPrompt += `. Style: ${style}.`;
    }

    if (negative_prompt) {
      enhancedPrompt += `. Avoid: ${negative_prompt}.`;
    }

    // Map size to DALL-E 3 supported sizes
    let dalleSize = '1024x1024';
    if (size === '1792x1024' || size === '1024x1792') {
      dalleSize = size;
    } else if (size === '512x512' || size === '256x256') {
      dalleSize = '1024x1024'; // DALL-E 3 doesn't support smaller sizes
    }

    // Call OpenAI DALL-E 3 API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: dalleSize,
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DALL-E 3 error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('DALL-E 3 response received');

    // Extract image URL from response
    const imageData = aiResponse.data?.[0];
    if (!imageData || !imageData.url) {
      throw new Error('No image generated');
    }

    const imageUrl = imageData.url;
    const revisedPrompt = imageData.revised_prompt || prompt;

    // Calculate cost for DALL-E 3
    // Standard quality: $0.040/image for 1024x1024, $0.080 for 1024x1792 or 1792x1024
    let cost = 0.04;
    if (dalleSize === '1024x1792' || dalleSize === '1792x1024') {
      cost = 0.08;
    }

    // Save to database
    const { data, error } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        conversation_id: conversation_id || null,
        prompt: prompt,
        revised_prompt: revisedPrompt,
        image_url: imageUrl,
        size: dalleSize,
        model_used: 'dall-e-3',
        cost: cost
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Update user's daily usage stats
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingStats } = await supabase
        .from('usage_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      
      if (existingStats) {
        await supabase
          .from('usage_stats')
          .update({
            total_cost: (existingStats.total_cost || 0) + cost,
            image_count: (existingStats.image_count || 0) + 1,
          })
          .eq('id', existingStats.id);
      } else {
        await supabase
          .from('usage_stats')
          .insert({
            user_id: user.id,
            date: today,
            total_tokens: 0,
            total_cost: cost,
            message_count: 0,
            image_count: 1,
          });
      }
      
      // Deduct from user credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const newBalance = Math.max(0, (profile.credit_balance || 5) - cost);
        await supabase
          .from('profiles')
          .update({ credit_balance: newBalance })
          .eq('id', user.id);
      }
      
      console.log('Image usage recorded');
    } catch (usageError) {
      console.error('Failed to record image usage:', usageError);
    }

    console.log('Image saved to database');

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate image error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
