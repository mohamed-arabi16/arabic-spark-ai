import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  className?: string;
  text?: string;
}

export function LoadingIndicator({ className, text }: LoadingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {text && <span className="text-xs">{text}</span>}
    </div>
  );
}
