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
    const { prompt, size = '1024x1024', conversation_id, negative_prompt, style } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    console.log(`Generating image for prompt: "${prompt.substring(0, 50)}..."`);

    // Construct the enhanced prompt
    let enhancedPrompt = `Generate an image: ${prompt}. Make it high quality and visually appealing.`;

    if (style && style !== 'none') {
      enhancedPrompt += ` Style: ${style}.`;
    }

    if (negative_prompt) {
      enhancedPrompt += ` Negative prompt (avoid these): ${negative_prompt}.`;
    }

    // Use Lovable AI's Nano Banana model for image generation
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    // Extract image from response
    const images = aiResponse.choices?.[0]?.message?.images;
    if (!images || images.length === 0) {
      throw new Error('No image generated');
    }

    const imageData = images[0]?.image_url?.url;
    if (!imageData) {
      throw new Error('Invalid image data');
    }

    // The image is base64 encoded - we'll store it in Supabase Storage
    let imageUrl = imageData;
    
    // If it's base64, upload to storage
    if (imageData.startsWith('data:image')) {
      // Create storage bucket if needed (using service role)
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Check if bucket exists, create if not
      const { data: buckets } = await adminSupabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.id === 'generated-images');
      
      if (!bucketExists) {
        await adminSupabase.storage.createBucket('generated-images', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
      }

      // Extract base64 data
      const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (base64Match) {
        const imageType = base64Match[1];
        const base64Data = base64Match[2];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileName = `${user.id}/${crypto.randomUUID()}.${imageType}`;
        
        const { error: uploadError } = await adminSupabase.storage
          .from('generated-images')
          .upload(fileName, binaryData, {
            contentType: `image/${imageType}`,
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          // Fall back to using base64 URL directly
        } else {
          // Get public URL
          const { data: urlData } = adminSupabase.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          
          imageUrl = urlData.publicUrl;
        }
      }
    }

    // Calculate estimated cost
    const cost = 0.02; // Approximate cost per image

    // Save to database
    const { data, error } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        conversation_id: conversation_id || null,
        prompt: prompt, // We save the original prompt, or should we save enhanced?
        // Let's save the original prompt to keep it clean for the user in history
        image_url: imageUrl,
        size,
        model_used: 'gemini-2.5-flash-image',
        cost
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error);
      throw error;
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
