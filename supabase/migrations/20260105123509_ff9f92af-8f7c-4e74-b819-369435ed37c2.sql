-- Create user_model_settings table for per-user model preferences
CREATE TABLE public.user_model_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Default model per function (capability-based)
  default_chat_model text DEFAULT 'openai/gpt-5.2',
  default_deep_think_model text DEFAULT 'google/gemini-3-pro',
  default_research_model text DEFAULT 'google/gemini-3-pro',
  default_image_model text DEFAULT 'google/nanobanana-pro',
  default_video_model text DEFAULT 'google/veo-2.1',
  
  -- Enabled models (all models user has access to)
  enabled_models text[] DEFAULT ARRAY[
    'openai/gpt-5.2', 'openai/gpt-5-nano', 'openai/gpt-image-1.5',
    'google/gemini-flash-3', 'google/gemini-3-pro', 'google/nanobanana-pro',
    'anthropic/sonnet-4.5', 'anthropic/haiku-4.5'
  ],
  
  -- Visible models in chat picker (subset of enabled - max 5 shown)
  visible_chat_models text[] DEFAULT ARRAY[
    'openai/gpt-5.2', 'google/gemini-3-pro', 'anthropic/sonnet-4.5'
  ],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_model_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_model_settings
CREATE POLICY "Users can read own settings"
  ON public.user_model_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_model_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_model_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Add current_model column to conversations for mid-conversation switching
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS current_model text DEFAULT NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_model_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_model_settings_updated_at
  BEFORE UPDATE ON public.user_model_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_model_settings_updated_at();