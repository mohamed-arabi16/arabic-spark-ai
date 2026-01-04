import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, Brain, Search, Image, Crown, ChevronDown } from 'lucide-react';
import { ChatMode } from './ModeSelector';

interface ModelPickerProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  dialect: string;
  onDialectChange: (dialect: string) => void;
  className?: string;
}

const modes = [
  { id: 'fast' as ChatMode, label: 'Fast', icon: Zap, color: 'text-green-500' },
  { id: 'standard' as ChatMode, label: 'Standard', icon: Sparkles, color: 'text-blue-500' },
  { id: 'deep' as ChatMode, label: 'Deep', icon: Brain, color: 'text-purple-500' },
  { id: 'pro' as ChatMode, label: 'Pro', icon: Crown, color: 'text-amber-500' },
  { id: 'research' as ChatMode, label: 'Research', icon: Search, color: 'text-sky-500' },
  { id: 'image' as ChatMode, label: 'Image', icon: Image, color: 'text-pink-500' },
];

const dialects = [
  { id: 'msa', label: 'MSA (Fusha)' },
  { id: 'egyptian', label: 'Egyptian' },
  { id: 'levantine', label: 'Levantine' },
  { id: 'gulf', label: 'Gulf' },
  { id: 'maghrebi', label: 'Maghrebi' },
];

export function ModelPicker({ mode, onModeChange, dialect, onDialectChange, className }: ModelPickerProps) {
  const { t } = useTranslation();
  const activeMode = modes.find((m) => m.id === mode) || modes[0];
  const activeDialect = dialects.find((d) => d.id === dialect) || dialects[0];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2 bg-background/50 backdrop-blur-sm border-dashed">
            <activeMode.icon className={cn("h-4 w-4", activeMode.color)} />
            <span className="text-xs font-medium">{activeMode.label}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">{t('settings.model')}</DropdownMenuLabel>
          {modes.map((m) => (
            <DropdownMenuItem
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className="gap-2 cursor-pointer"
            >
              <m.icon className={cn("h-4 w-4", m.color)} />
              <span className="flex-1">{m.label}</span>
              {mode === m.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
            <span className="text-xs font-medium">{activeDialect.label}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
           <DropdownMenuLabel className="text-xs text-muted-foreground">Dialect</DropdownMenuLabel>
           {dialects.map((d) => (
             <DropdownMenuItem
               key={d.id}
               onClick={() => onDialectChange(d.id)}
               className="gap-2 cursor-pointer"
             >
               <span className="flex-1">{d.label}</span>
               {dialect === d.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
             </DropdownMenuItem>
           ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        {t('common.activeNow') || 'Active now'}
      </div>
    </div>
  );
}
