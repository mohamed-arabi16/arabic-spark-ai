import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CostMeterProps {
  sessionCost?: number;
}

export function CostMeter({ sessionCost = 0 }: CostMeterProps) {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors"
      onClick={() => navigate('/usage')}
    >
      <DollarSign className="h-3 w-3" />
      <span>Session: ${sessionCost.toFixed(4)}</span>
    </div>
  );
}
