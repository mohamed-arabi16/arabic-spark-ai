-- =============================================
-- Production Readiness Security Migration
-- =============================================

-- 0. Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Admin Overrides Table for subscription/feature overrides
CREATE TABLE IF NOT EXISTS public.admin_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL,
  override_value JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on admin_overrides
ALTER TABLE public.admin_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view their own overrides (required by useSubscription hook)
CREATE POLICY "Users can view own overrides"
  ON public.admin_overrides FOR SELECT
  USING (auth.uid() = user_id);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_admin_overrides_user_id 
  ON public.admin_overrides(user_id);

-- 2. Webhook Events Table for Stripe idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,  -- Stripe event ID for deduplication
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB,
  status TEXT DEFAULT 'processed',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for cleanup queries (delete old events)
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
  ON public.webhook_events(created_at);

-- RLS: Only service role can access (no user policies = service_role only)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 3. Input Sanitization Function for XSS prevention
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  result := input_text;
  
  -- Proper encoding order: & first to prevent double-encoding
  result := REPLACE(result, '&', '&amp;');
  result := REPLACE(result, '<', '&lt;');
  result := REPLACE(result, '>', '&gt;');
  result := REPLACE(result, '"', '&quot;');
  result := REPLACE(result, '''', '&#x27;');
  
  -- Remove potential script patterns
  result := REGEXP_REPLACE(result, '<script[^>]*>.*?</script>', '', 'gi');
  result := REGEXP_REPLACE(result, 'javascript:', '', 'gi');
  result := REGEXP_REPLACE(result, 'on\w+\s*=', '', 'gi');
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.sanitize_text IS 'Sanitizes text input to prevent XSS attacks with proper encoding order';

-- 4. Add updated_at trigger for admin_overrides
CREATE TRIGGER update_admin_overrides_updated_at
  BEFORE UPDATE ON public.admin_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();