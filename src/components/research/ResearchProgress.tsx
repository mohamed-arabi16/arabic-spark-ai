import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ResearchProgressProps {
  isResearching: boolean;
}

export function ResearchProgress({ isResearching }: ResearchProgressProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    t('research.stepGathering'),
    t('research.stepReading'),
    t('research.stepAnalyzing'),
    t('research.stepSummarizing')
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

  if (!isResearching) return null;

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t('research.researchProgress')}</h3>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                {index < currentStep ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : index === currentStep ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={index === currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
