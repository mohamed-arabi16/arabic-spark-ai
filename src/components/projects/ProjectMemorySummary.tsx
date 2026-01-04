import { useMemory } from '@/hooks/useMemory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Heart, User, Settings, Lightbulb, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo } from 'react';

interface ProjectMemorySummaryProps {
  projectId?: string;
}

const categoryIcons: Record<string, any> = {
  preference: Heart,
  fact: User,
  instruction: Settings,
  style: Lightbulb,
  default: Brain,
};

const categoryColors: Record<string, string> = {
  preference: 'text-pink-400',
  fact: 'text-blue-400',
  instruction: 'text-purple-400',
  style: 'text-amber-400',
  default: 'text-muted-foreground',
};

export function ProjectMemorySummary({ projectId }: ProjectMemorySummaryProps) {
  const { t } = useTranslation();
  // Pass projectId to useMemory to filter automatically or we filter client side
  // useMemory implementation takes projectId in constructor but here it is a hook.
  // The hook definition: export function useMemory(projectId?: string)
  // So we can pass it.
  const { memories, proposedMemories, isLoading, fetchMemories } = useMemory(projectId);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      preference: 0,
      fact: 0,
      instruction: 0,
      style: 0,
      other: 0
    };

    memories.forEach(m => {
      const cat = m.category || 'other';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.other++;
      }
    });

    return {
      counts,
      total: memories.length,
      pending: proposedMemories.length
    };
  }, [memories, proposedMemories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold">{stats.total}</span>
            <span className="text-xs text-muted-foreground">{t('memory.total', 'Total Memories')}</span>
          </CardContent>
        </Card>
        <Card className={stats.pending > 0 ? 'border-amber-500/50 bg-amber-500/5' : ''}>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-amber-500">{stats.pending}</span>
            <span className="text-xs text-muted-foreground">{t('memory.pending', 'Pending')}</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">{t('memory.byCategory', 'By Category')}</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(stats.counts).map(([cat, count]) => {
            if (count === 0 && cat !== 'other') return null;
            const Icon = categoryIcons[cat] || categoryIcons.default;
            const colorClass = categoryColors[cat] || categoryColors.default;

            return (
              <div key={cat} className="flex items-center justify-between p-2 rounded-md border bg-card/50">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <span className="text-sm capitalize">{cat}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
