import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatLocalizedNumber } from '@/lib/formatters';

interface CostMeterProps {
  sessionCost?: number;
}

export function CostMeter({ sessionCost = 0 }: CostMeterProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  return (
    <div
      className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors"
      onClick={() => navigate('/usage')}
    >
      <DollarSign className="h-3 w-3" />
      <span>Session: ${formatLocalizedNumber(sessionCost, i18n.language)}</span>
    </div>
  );
}
