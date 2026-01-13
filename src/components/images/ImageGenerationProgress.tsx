import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ProgressIndicator } from '@/components/common/ProgressIndicator';

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

  return (
    <ProgressIndicator
      isActive={isGenerating}
      progress={progress}
      status={status}
    />
  );
}
