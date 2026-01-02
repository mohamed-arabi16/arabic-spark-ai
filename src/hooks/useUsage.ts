import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';

export type UsageStat = Tables<'usage_stats'>;

export interface UsageSummary {
  total_tokens: number;
  total_cost: number;
  total_images: number;
  total_messages: number;
}

export interface ModelBreakdown {
  model: string;
  tokens: number;
  cost: number;
}

export function useUsage() {
  const [dailyStats, setDailyStats] = useState<UsageStat[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [breakdown, setBreakdown] = useState<ModelBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsage = useCallback(async (days = 30) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase.functions.invoke('usage-stats', {
        body: { user_id: user.id, start_date: startDate, end_date: endDate }
      });

      if (error) throw error;

      setDailyStats(data.daily_stats);
      setSummary(data.summary);
      setBreakdown(data.breakdown);
    } catch (error) {
      console.error('Error fetching usage:', error);
      toast.error('Failed to load usage stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    dailyStats,
    summary,
    breakdown,
    isLoading,
    fetchUsage
  };
}
