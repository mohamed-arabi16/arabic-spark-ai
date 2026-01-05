import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUsage } from '@/hooks/useUsage';
import { UsageSummaryCards } from '@/components/usage/UsageSummary';
import { UsageChart } from '@/components/usage/UsageChart';
import { UsageBreakdown } from '@/components/usage/UsageBreakdown';
import { QuotaDisplay } from '@/components/usage/QuotaDisplay';
import { BudgetCard } from '@/components/usage/BudgetCard';
import { ProjectUsageTable } from '@/components/usage/ProjectUsageTable';
import { TopConversationsTable } from '@/components/usage/TopConversationsTable';
import { SkeletonSummaryCards, SkeletonChart } from '@/components/ui/skeleton-list';

export default function Usage() {
  const { t } = useTranslation();
  const { dailyStats, summary, breakdown, projectBreakdown, topConversations, isLoading, fetchUsage } = useUsage();

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return (
    <MainLayout>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('usage.title')}</h1>
          <p className="text-muted-foreground">
            {t('usage.subtitle')}
          </p>
        </div>

        {isLoading && !summary ? (
          <div className="space-y-6">
            <SkeletonSummaryCards count={4} />
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
              <SkeletonChart className="col-span-1 lg:col-span-4" />
              <SkeletonChart className="col-span-1 lg:col-span-3" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <UsageSummaryCards summary={summary} />

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
              <UsageChart data={dailyStats} />
              <UsageBreakdown data={breakdown} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
               <ProjectUsageTable data={projectBreakdown} />
               <div className="col-span-1 lg:col-span-3 space-y-6">
                 <BudgetCard currentCost={summary?.total_cost || 0} />
                 <QuotaDisplay currentCost={summary?.total_cost || 0} />
               </div>
            </div>

            {/* Top conversations by cost */}
            <TopConversationsTable 
              conversations={topConversations} 
              isLoading={isLoading} 
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
