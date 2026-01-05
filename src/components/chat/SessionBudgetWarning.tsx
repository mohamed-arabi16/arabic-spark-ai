import { useTranslation } from 'react-i18next';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionBudgetWarningProps {
  sessionCost: number;
  threshold?: number;
  className?: string;
}

export function SessionBudgetWarning({ 
  sessionCost, 
  threshold = 0.10,
  className 
}: SessionBudgetWarningProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  if (sessionCost < threshold) {
    return null;
  }

  const isHigh = sessionCost >= threshold * 3;

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
        isHigh 
          ? 'bg-destructive/10 text-destructive' 
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        isRTL && 'flex-row-reverse',
        className
      )}
    >
      {isHigh ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <TrendingUp className="h-3 w-3" />
      )}
      <span>
        {t('budget.sessionCost', { cost: sessionCost.toFixed(4) })}
      </span>
    </div>
  );
}
