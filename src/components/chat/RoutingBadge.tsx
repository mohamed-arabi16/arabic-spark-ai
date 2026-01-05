import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wand2, Settings2, ChevronDown, Info, Bot, Sparkles, Flame } from 'lucide-react';
import { getModelExplanation, getRoutingExplanation } from '@/lib/model-explanations';
import { getModelDisplayName, parseModelId } from '@/lib/model-names';

interface RoutingBadgeProps {
  routingMode: 'auto' | 'manual';
  onRoutingModeChange: (mode: 'auto' | 'manual') => void;
  currentModel?: string;
  taskType?: 'chat' | 'deep_think' | 'research' | 'image';
  className?: string;
}

const providerIcons: Record<string, typeof Bot> = {
  openai: Bot,
  google: Sparkles,
  anthropic: Flame,
};

const providerColors: Record<string, string> = {
  openai: 'text-green-500',
  google: 'text-blue-500',
  anthropic: 'text-orange-500',
};

export function RoutingBadge({
  routingMode,
  onRoutingModeChange,
  currentModel,
  taskType = 'chat',
  className,
}: RoutingBadgeProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = i18n.language;

  const { provider } = currentModel ? parseModelId(currentModel) : { provider: 'unknown' };
  const ProviderIcon = providerIcons[provider] || Bot;
  const providerColor = providerColors[provider] || 'text-muted-foreground';

  const modelName = currentModel ? getModelDisplayName(currentModel, locale, true) : t('chat.selectModel');
  const modelExplanation = currentModel ? getModelExplanation(currentModel, locale) : '';
  const routingExplanation = getRoutingExplanation(routingMode, locale);

  const isAuto = routingMode === 'auto';

  return (
    <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse', className)}>
      {/* Routing Mode Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 gap-1 text-xs font-medium',
              isAuto ? 'text-primary' : 'text-muted-foreground',
              isRTL && 'flex-row-reverse'
            )}
          >
            {isAuto ? (
              <Wand2 className="h-3 w-3" />
            ) : (
              <Settings2 className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {isAuto ? t('routing.auto') : t('routing.manual')}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-[200px]">
          <DropdownMenuItem
            onClick={() => onRoutingModeChange('auto')}
            className={cn('gap-2', isAuto && 'bg-primary/10')}
          >
            <Wand2 className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <span className="font-medium">{t('routing.autoRecommended')}</span>
              <p className="text-[10px] text-muted-foreground">{t('routing.autoDesc')}</p>
            </div>
            {isAuto && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onRoutingModeChange('manual')}
            className={cn('gap-2', !isAuto && 'bg-muted/50')}
          >
            <Settings2 className="h-4 w-4" />
            <div className="flex-1">
              <span className="font-medium">{t('routing.manual')}</span>
              <p className="text-[10px] text-muted-foreground">{t('routing.manualDesc')}</p>
            </div>
            {!isAuto && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Current Model Display with Why tooltip */}
      {currentModel && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'h-6 gap-1 cursor-help bg-background/50 backdrop-blur-sm',
                isRTL && 'flex-row-reverse'
              )}
            >
              <ProviderIcon className={cn('h-3 w-3', providerColor)} />
              <span dir="ltr" className="text-[10px] font-medium">
                {modelName}
              </span>
              <Info className="h-3 w-3 text-muted-foreground" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px]">
            <div className="space-y-1">
              <p className="text-xs font-medium">{t('routing.whyThisModel')}</p>
              <p className="text-[10px] text-muted-foreground">{routingExplanation}</p>
              {modelExplanation && (
                <p className="text-[10px] text-muted-foreground">{modelExplanation}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
