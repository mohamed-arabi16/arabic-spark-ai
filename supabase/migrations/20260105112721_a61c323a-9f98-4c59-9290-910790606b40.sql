-- Create anonymous_sessions table for tracking trial usage
CREATE TABLE public.anonymous_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  message_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (these are anonymous users after all)
CREATE POLICY "Allow anonymous session creation and updates"
ON public.anonymous_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for fast lookup
CREATE INDEX idx_anonymous_sessions_session_id ON public.anonymous_sessions(session_id);

-- Add subscription and credit fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS credit_balance numeric DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 5.00;