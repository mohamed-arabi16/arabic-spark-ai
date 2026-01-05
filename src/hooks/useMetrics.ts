import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MemoryMetrics {
  totalProposed: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
  rejectRate: number;
  usageCount: number;
}

export interface FeedbackMetrics {
  positive: number;
  negative: number;
  fluencyIssues: number;
  reaskRequests: number;
  totalFeedback: number;
}

export interface RoutingMetrics {
  totalRequests: number;
  fallbackCount: number;
  fallbackRate: number;
  avgCostPerRequest: number;
}

export function useMetrics() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [feedbackMetrics, setFeedbackMetrics] = useState<FeedbackMetrics | null>(null);

  const fetchMemoryMetrics = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    try {
      // Get memory counts by status from audit log
      const { data: auditData, error: auditError } = await supabase
        .from('memory_audit_log')
        .select('action')
        .eq('user_id', user.id);

      if (auditError) throw auditError;

      const actionCounts = (auditData || []).reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get active memory counts
      const { data: memories, error: memError } = await supabase
        .from('memory_objects')
        .select('status, last_used_at')
        .eq('user_id', user.id);

      if (memError) throw memError;

      const statusCounts = (memories || []).reduce((acc, mem) => {
        acc[mem.status || 'proposed'] = (acc[mem.status || 'proposed'] || 0) + 1;
        if (mem.last_used_at) acc.used = (acc.used || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalProposed = actionCounts.created || statusCounts.proposed || 0;
      const totalApproved = statusCounts.approved || 0;
      const totalRejected = actionCounts.rejected || 0;
      const total = totalProposed + totalApproved + totalRejected;

      const metrics: MemoryMetrics = {
        totalProposed,
        totalApproved,
        totalRejected,
        approvalRate: total > 0 ? (totalApproved / total) * 100 : 0,
        rejectRate: total > 0 ? (totalRejected / total) * 100 : 0,
        usageCount: statusCounts.used || 0,
      };

      setMemoryMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to fetch memory metrics:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchFeedbackMetrics = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('feedback_type')
        .eq('user_id', user.id);

      if (error) throw error;

      const counts = (data || []).reduce((acc, fb) => {
        acc[fb.feedback_type] = (acc[fb.feedback_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const metrics: FeedbackMetrics = {
        positive: counts.positive || 0,
        negative: counts.negative || 0,
        fluencyIssues: counts.fluency_issue || 0,
        reaskRequests: counts.reask || 0,
        totalFeedback: data?.length || 0,
      };

      setFeedbackMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to fetch feedback metrics:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const submitFeedback = useCallback(async (
    messageId: string,
    feedbackType: 'positive' | 'negative' | 'fluency_issue' | 'reask',
    comment?: string
  ) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('message_feedback')
        .insert({
          message_id: messageId,
          user_id: user.id,
          feedback_type: feedbackType,
          comment,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  }, [user]);

  return {
    isLoading,
    memoryMetrics,
    feedbackMetrics,
    fetchMemoryMetrics,
    fetchFeedbackMetrics,
    submitFeedback,
  };
}
