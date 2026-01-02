import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface QuotaDisplayProps {
  currentCost: number;
  limit?: number;
}

export function QuotaDisplay({ currentCost, limit = 50 }: QuotaDisplayProps) {
  const percentage = Math.min((currentCost / limit) * 100, 100);
  const isWarning = percentage > 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Quota</CardTitle>
        <CardDescription>
          Usage limit for the current billing cycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
           <div className="flex justify-between text-sm">
             <span>${currentCost.toFixed(2)} used</span>
             <span className="text-muted-foreground">Limit: ${limit.toFixed(2)}</span>
           </div>
           <Progress value={percentage} className={isWarning ? "bg-secondary" : ""} />
        </div>
        {isWarning && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            You are approaching your monthly spending limit.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
