-- Add budget-related columns to profiles and projects tables
-- Daily budget for users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_budget numeric DEFAULT 5.00;

-- Per-project budget
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_limit numeric DEFAULT NULL;

-- Session warning threshold (soft limit)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_warning_threshold numeric DEFAULT 1.00;

-- Create index for faster budget lookups
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON public.usage_stats(user_id, date);

-- Create a function to get today's spending
CREATE OR REPLACE FUNCTION public.get_daily_spending(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_cost), 0)
  FROM usage_stats
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE;
$$;

-- Create a function to get project spending (last 30 days)
CREATE OR REPLACE FUNCTION public.get_project_spending(p_project_id uuid, p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_cost), 0)
  FROM conversations
  WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
$$;