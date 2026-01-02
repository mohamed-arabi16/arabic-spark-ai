import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Zap, Sparkles, Brain, Search, Image, Crown } from 'lucide-react';

export type ChatMode = 'fast' | 'standard' | 'deep' | 'pro' | 'research' | 'image';

interface ModeSelectorProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const modes = [
  {
    id: 'fast' as ChatMode,
    label: 'Fast',
    description: 'Minimal thinking - instant responses',
    icon: Zap,
    color: 'mode-fast',
    intensity: 1,
  },
  {
    id: 'standard' as ChatMode,
    label: 'Standard',
    description: 'Light reasoning - everyday tasks',
    icon: Sparkles,
    color: 'mode-standard',
    intensity: 2,
  },
  {
    id: 'deep' as ChatMode,
    label: 'Deep',
    description: 'Medium reasoning - complex analysis',
    icon: Brain,
    color: 'mode-deep',
    intensity: 3,
  },
  {
    id: 'pro' as ChatMode,
    label: 'Pro',
    description: 'Maximum thinking - PhD-level reasoning',
    icon: Crown,
    color: 'mode-pro',
    intensity: 4,
  },
  {
    id: 'research' as ChatMode,
    label: 'Research',
    description: 'Medium reasoning + live web search',
    icon: Search,
    color: 'mode-research',
    intensity: 3,
  },
  {
    id: 'image' as ChatMode,
    label: 'Image',
    description: 'Generate and edit images',
    icon: Image,
    color: 'mode-image',
    intensity: 0,
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
                {m.intensity > 0 && isActive && (
                   <div className="flex gap-0.5 ml-1">
                     {Array.from({ length: 4 }).map((_, i) => (
                       <div
                         key={i}
                         className={cn(
                           "w-1 h-2 rounded-full transition-colors",
                           i < m.intensity
                             ? `${m.color}-bg opacity-80`
                             : "bg-muted/30"
                         )}
                       />
                     ))}
                   </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium flex items-center gap-2">
                {m.label}
                {m.intensity > 0 && (
                   <span className="flex gap-0.5">
                     {Array.from({ length: 4 }).map((_, i) => (
                       <span
                         key={i}
                         className={cn(
                           "w-1 h-1 rounded-full",
                           i < m.intensity
                             ? "bg-primary"
                             : "bg-muted"
                         )}
                       />
                     ))}
                   </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
