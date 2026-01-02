import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUsage } from '@/hooks/useUsage';
import { UsageSummaryCards } from '@/components/usage/UsageSummary';
import { UsageChart } from '@/components/usage/UsageChart';
import { UsageBreakdown } from '@/components/usage/UsageBreakdown';
import { QuotaDisplay } from '@/components/usage/QuotaDisplay';
import { Loader2 } from 'lucide-react';

export default function Usage() {
  const { dailyStats, summary, breakdown, isLoading, fetchUsage } = useUsage();

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return (
    <MainLayout>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your consumption, costs, and limits.
          </p>
        </div>

        {isLoading && !summary ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <UsageSummaryCards summary={summary} />

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
              <UsageChart data={dailyStats} />
              <UsageBreakdown data={breakdown} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuotaDisplay currentCost={summary?.total_cost || 0} />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
