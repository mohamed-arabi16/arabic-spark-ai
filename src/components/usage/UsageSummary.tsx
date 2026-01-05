import { UsageSummary } from '@/hooks/useUsage';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Coins, MessageSquare, Image, Zap } from 'lucide-react';
import { prefersReducedMotion, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface UsageSummaryProps {
  summary: UsageSummary | null;
}

export function UsageSummaryCards({ summary }: UsageSummaryProps) {
  const { t } = useTranslation();
  const reducedMotion = prefersReducedMotion();
  
  if (!summary) return null;

  const items = [
    {
      title: t('usage.totalCost'),
      value: `$${summary.total_cost.toFixed(2)}`,
      icon: Coins,
      description: t('usage.estimatedCost'),
      accent: 'text-emerald-500',
    },
    {
      title: t('usage.tokens'),
      value: summary.total_tokens.toLocaleString(),
      icon: Zap,
      description: t('usage.inputOutput'),
      accent: 'text-amber-500',
    },
    {
      title: t('usage.messages'),
      value: summary.total_messages.toLocaleString(),
      icon: MessageSquare,
      description: t('usage.totalMessages'),
      accent: 'text-blue-500',
    },
    {
      title: t('usage.images'),
      value: summary.total_images.toLocaleString(),
      icon: Image,
      description: t('usage.generatedImages'),
      accent: 'text-purple-500',
    },
  ];

  const CardWrapper = reducedMotion ? 'div' : motion.div;

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <CardWrapper
          key={item.title}
          className="glass rounded-2xl p-5 md:p-6"
          {...(reducedMotion ? {} : { variants: staggerItem })}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              {item.title}
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              "bg-foreground/5"
            )}>
              <item.icon className={cn("h-4 w-4", item.accent)} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold tracking-tight">{item.value}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {item.description}
          </p>
        </CardWrapper>
      ))}
    </div>
  );
}
