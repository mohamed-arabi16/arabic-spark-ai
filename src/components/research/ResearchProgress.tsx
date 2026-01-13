import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ProgressIndicator } from '@/components/common/ProgressIndicator';

interface ResearchProgressProps {
  isResearching: boolean;
}

export function ResearchProgress({ isResearching }: ResearchProgressProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: t('research.stepGathering') },
    { label: t('research.stepReading') },
    { label: t('research.stepAnalyzing') },
    { label: t('research.stepSummarizing') },
  ];

  useEffect(() => {
    if (!isResearching) {
      setCurrentStep(0);
      return;
    }

    // Simulate progress
    const timers = [
      setTimeout(() => setCurrentStep(1), 2000),
      setTimeout(() => setCurrentStep(2), 5000),
      setTimeout(() => setCurrentStep(3), 8000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isResearching]);

  return (
    <ProgressIndicator
      isActive={isResearching}
      useSteps
      steps={steps}
      currentStep={currentStep}
      title={t('research.researchProgress')}
    />
  );
}
