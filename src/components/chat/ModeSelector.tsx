import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Zap, Sparkles, Brain, Search, Image } from 'lucide-react';

export type ChatMode = 'fast' | 'standard' | 'deep' | 'research' | 'image';

interface ModeSelectorProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const modes = [
  {
    id: 'fast' as ChatMode,
    label: 'Fast',
    description: 'Quick responses, lower cost',
    icon: Zap,
    color: 'mode-fast',
  },
  {
    id: 'standard' as ChatMode,
    label: 'Standard',
    description: 'Balanced quality and speed',
    icon: Sparkles,
    color: 'mode-standard',
  },
  {
    id: 'deep' as ChatMode,
    label: 'Deep',
    description: 'Complex reasoning, higher quality',
    icon: Brain,
    color: 'mode-deep',
  },
  {
    id: 'research' as ChatMode,
    label: 'Research',
    description: 'Web search + citations',
    icon: Search,
    color: 'mode-research',
  },
  {
    id: 'image' as ChatMode,
    label: 'Image',
    description: 'Generate and edit images',
    icon: Image,
    color: 'mode-image',
  },
];

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
      {modes.map((m) => {
        const isActive = mode === m.id;
        return (
          <Tooltip key={m.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 gap-1.5 px-3 transition-all',
                  isActive
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                )}
                onClick={() => onModeChange(m.id)}
              >
                <m.icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive && `${m.color}-text`
                  )}
                />
                <span className="text-sm font-medium">{m.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
