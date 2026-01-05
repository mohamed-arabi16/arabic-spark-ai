import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
import { MetricsSummary } from '@/components/usage/MetricsSummary';
import { Separator } from '@/components/ui/separator';
import { staggerContainer, staggerItem, prefersReducedMotion } from '@/lib/motion';

export default function Usage() {
  const { t } = useTranslation();
  const reducedMotion = prefersReducedMotion();
  const { dailyStats, summary, breakdown, projectBreakdown, topConversations, isLoading, fetchUsage } = useUsage();

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const MotionDiv = reducedMotion ? 'div' : motion.div;

  return (
    <MainLayout>
      <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('usage.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('usage.subtitle')}
          </p>
        </div>

        {isLoading && !summary ? (
          <div className="space-y-8">
            <SkeletonSummaryCards count={4} />
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
              <SkeletonChart className="col-span-1 lg:col-span-4" />
              <SkeletonChart className="col-span-1 lg:col-span-3" />
            </div>
          </div>
        ) : (
          <MotionDiv
            className="space-y-8"
            {...(reducedMotion ? {} : { variants: staggerContainer, initial: "hidden", animate: "visible" })}
          >
            {/* Summary Cards */}
            <MotionDiv {...(reducedMotion ? {} : { variants: staggerItem })}>
              <UsageSummaryCards summary={summary} />
            </MotionDiv>

            {/* Charts Row */}
            <MotionDiv 
              className="grid grid-cols-1 lg:grid-cols-7 gap-6"
              {...(reducedMotion ? {} : { variants: staggerItem })}
            >
              <UsageChart data={dailyStats} />
              <UsageBreakdown data={breakdown} />
            </MotionDiv>

            {/* Budget & Quota Row */}
            <MotionDiv 
              className="grid grid-cols-1 lg:grid-cols-7 gap-6"
              {...(reducedMotion ? {} : { variants: staggerItem })}
            >
              <ProjectUsageTable data={projectBreakdown} />
              <div className="col-span-1 lg:col-span-3 space-y-6">
                <BudgetCard currentCost={summary?.total_cost || 0} />
                <QuotaDisplay currentCost={summary?.total_cost || 0} />
              </div>
            </MotionDiv>

            {/* Top Conversations */}
            <MotionDiv {...(reducedMotion ? {} : { variants: staggerItem })}>
              <TopConversationsTable 
                conversations={topConversations} 
                isLoading={isLoading} 
              />
            </MotionDiv>

            <Separator className="bg-border/50" />

            {/* Memory & Feedback Metrics */}
            <MotionDiv {...(reducedMotion ? {} : { variants: staggerItem })}>
              <h2 className="text-lg font-semibold mb-5">{t('metrics.memoryTitle')}</h2>
              <MetricsSummary />
            </MotionDiv>
          </MotionDiv>
        )}
      </div>
    </MainLayout>
  );
}
