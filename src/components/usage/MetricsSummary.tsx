import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, ThumbsUp, ThumbsDown, MessageCircle, Sparkles } from 'lucide-react';
import { useMetrics } from '@/hooks/useMetrics';
import { Skeleton } from '@/components/ui/skeleton';

export function MetricsSummary() {
  const { t } = useTranslation();
  const { 
    isLoading, 
    memoryMetrics, 
    feedbackMetrics, 
    fetchMemoryMetrics, 
    fetchFeedbackMetrics 
  } = useMetrics();

  useEffect(() => {
    fetchMemoryMetrics();
    fetchFeedbackMetrics();
  }, [fetchMemoryMetrics, fetchFeedbackMetrics]);

  if (isLoading && !memoryMetrics && !feedbackMetrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Memory Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {t('metrics.memoryTitle')}
          </CardTitle>
          <CardDescription>{t('metrics.memoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {memoryMetrics ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('metrics.approvalRate')}</span>
                <span className="font-medium">{memoryMetrics.approvalRate.toFixed(1)}%</span>
              </div>
              <Progress value={memoryMetrics.approvalRate} className="h-2" />
              
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{memoryMetrics.totalApproved}</p>
                  <p className="text-xs text-muted-foreground">{t('metrics.approved')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-muted-foreground">{memoryMetrics.totalProposed}</p>
                  <p className="text-xs text-muted-foreground">{t('metrics.pending')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{memoryMetrics.totalRejected}</p>
                  <p className="text-xs text-muted-foreground">{t('metrics.rejected')}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('metrics.noData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Feedback Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('metrics.feedbackTitle')}
          </CardTitle>
          <CardDescription>{t('metrics.feedbackDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbackMetrics && feedbackMetrics.totalFeedback > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('metrics.positiveRate')}</span>
                <span className="font-medium">
                  {feedbackMetrics.totalFeedback > 0 
                    ? ((feedbackMetrics.positive / feedbackMetrics.totalFeedback) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
              <Progress 
                value={feedbackMetrics.totalFeedback > 0 
                  ? (feedbackMetrics.positive / feedbackMetrics.totalFeedback) * 100 
                  : 0} 
                className="h-2" 
              />
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-semibold">{feedbackMetrics.positive}</p>
                    <p className="text-xs text-muted-foreground">{t('metrics.positive')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-semibold">{feedbackMetrics.negative}</p>
                    <p className="text-xs text-muted-foreground">{t('metrics.negative')}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t('metrics.noFeedback')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
