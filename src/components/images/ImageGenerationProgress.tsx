import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ImageGenerationProgressProps {
  isGenerating: boolean;
}

export function ImageGenerationProgress({ isGenerating }: ImageGenerationProgressProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      setStatus('');
      return;
    }

    setProgress(5);
    setStatus(t('images.statusInitializing'));

    const timers: NodeJS.Timeout[] = [];

    // Simulate progress
    timers.push(setTimeout(() => {
      setProgress(30);
      setStatus(t('images.statusGenerating'));
    }, 2000));

    timers.push(setTimeout(() => {
      setProgress(70);
      setStatus(t('images.statusRefining'));
    }, 6000));

    timers.push(setTimeout(() => {
      setProgress(90);
      setStatus(t('images.statusFinalizing'));
    }, 10000));

    return () => timers.forEach(clearTimeout);
  }, [isGenerating, t]);

  if (!isGenerating) return null;

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {status}
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
