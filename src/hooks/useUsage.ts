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

export interface ProjectBreakdown {
  project_id: string;
  project_name?: string;
  tokens: number;
  cost: number;
}

export interface TopConversation {
  id: string;
  title: string | null;
  total_cost: number | null;
  total_tokens: number | null;
  project_id: string | null;
  project_name?: string;
}

export function useUsage() {
  const [dailyStats, setDailyStats] = useState<UsageStat[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [breakdown, setBreakdown] = useState<ModelBreakdown[]>([]);
  const [projectBreakdown, setProjectBreakdown] = useState<ProjectBreakdown[]>([]);
  const [topConversations, setTopConversations] = useState<TopConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsage = useCallback(async (days = 30) => {
    setIsLoading(true);
    let userId = 'mock-user';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // 1. Fetch main stats from edge function
      const { data, error } = await supabase.functions.invoke('usage-stats', {
        body: { user_id: user.id, start_date: startDate, end_date: endDate }
      });

      if (error) {
        throw error;
      }

      if (!data || !data.daily_stats) {
          throw new Error('Invalid data format');
      }

      setDailyStats(data.daily_stats);
      setSummary(data.summary);
      setBreakdown(data.breakdown);

      // 2. Fetch project stats directly from DB to group by project_id
      const { data: rawStats, error: statsError } = await supabase
        .from('usage_stats')
        .select(`
          project_id,
          tokens,
          cost,
          projects (name)
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate + 'T00:00:00');

      if (!statsError && rawStats) {
        // Aggregate by project
        const projectMap = new Map<string, ProjectBreakdown>();

        rawStats.forEach((stat: any) => {
          const pid = stat.project_id || 'unknown';
          const pname = stat.projects?.name || (pid === 'unknown' ? 'Unknown Project' : 'Deleted Project');

          if (!projectMap.has(pid)) {
            projectMap.set(pid, {
              project_id: pid,
              project_name: pname,
              tokens: 0,
              cost: 0
            });
          }

          const entry = projectMap.get(pid)!;
          entry.tokens += stat.tokens || 0;
          entry.cost += stat.cost || 0;
        });

        setProjectBreakdown(Array.from(projectMap.values()).sort((a, b) => b.cost - a.cost));
      }

      // 3. Fetch top conversations by cost
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          total_cost,
          total_tokens,
          project_id,
          projects (name)
        `)
        .eq('user_id', user.id)
        .order('total_cost', { ascending: false, nullsFirst: false })
        .limit(10);

      if (!convError && convData) {
        const topConvs: TopConversation[] = convData.map((c: any) => ({
          id: c.id,
          title: c.title,
          total_cost: c.total_cost,
          total_tokens: c.total_tokens,
          project_id: c.project_id,
          project_name: c.projects?.name,
        }));
        setTopConversations(topConvs);
      }

    } catch (error) {
      console.error('Error fetching usage:', error);
      toast.error('Failed to load usage data');
      // Set empty state - no mock data
      setDailyStats([]);
      setSummary({
        total_tokens: 0,
        total_cost: 0,
        total_images: 0,
        total_messages: 0
      });
      setBreakdown([]);
      setProjectBreakdown([]);
      setTopConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    dailyStats,
    summary,
    breakdown,
    projectBreakdown,
    topConversations,
    isLoading,
    fetchUsage
  };
}
