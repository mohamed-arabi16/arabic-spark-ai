import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, Circle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  label: string;
  completed?: boolean;
}

interface ProgressIndicatorProps {
  /** Whether the progress indicator is active/visible */
  isActive: boolean;
  /** Current progress percentage (0-100) for progress bar mode */
  progress?: number;
  /** Status message to display */
  status?: string;
  /** Steps for step-based progress indicator */
  steps?: ProgressStep[];
  /** Current step index (0-based) for step-based mode */
  currentStep?: number;
  /** Title for the progress indicator */
  title?: string;
  /** Additional className */
  className?: string;
  /** Use step-based progress instead of progress bar */
  useSteps?: boolean;
}

/**
 * Reusable progress indicator component for long-running operations.
 * Supports both progress bar mode and step-based mode.
 * 
 * @example
 * // Progress bar mode
 * <ProgressIndicator isActive={isLoading} progress={50} status="Processing..." />
 * 
 * @example
 * // Step-based mode
 * <ProgressIndicator 
 *   isActive={isLoading} 
 *   useSteps 
 *   steps={[{ label: "Step 1" }, { label: "Step 2" }]} 
 *   currentStep={0} 
 * />
 */
export function ProgressIndicator({
  isActive,
  progress = 0,
  status,
  steps = [],
  currentStep = 0,
  title,
  className,
  useSteps = false,
}: ProgressIndicatorProps) {
  if (!isActive) return null;

  return (
    <Card className={cn("border-primary/20 bg-muted/30", className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          
          {useSteps ? (
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
                  <span className={cn(
                    index === currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {status}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
