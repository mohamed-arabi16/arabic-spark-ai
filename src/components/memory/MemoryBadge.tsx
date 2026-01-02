import { Badge } from '@/components/ui/badge';
import { BrainCircuit } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface MemoryBadgeProps {
  count: number;
  onClick?: () => void;
}

export function MemoryBadge({ count, onClick }: MemoryBadgeProps) {
  if (count === 0) return null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge
          variant="secondary"
          className="gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
          onClick={onClick}
        >
          <BrainCircuit className="h-3 w-3" />
          {count} memories active
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-60">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Active Memory</h4>
          <p className="text-xs text-muted-foreground">
            The AI has access to {count} facts and preferences from your memory bank.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
