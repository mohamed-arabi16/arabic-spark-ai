import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, Brain, Search, Image, Crown, ChevronDown, HelpCircle, Bot, Cpu, Flame } from 'lucide-react';
import { ChatMode } from './ModeSelector';
import { ModelHelpPanel } from './ModelHelpPanel';
import { Badge } from '@/components/ui/badge';

interface ModelInfo {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  tier: string;
  provider: string;
  available: boolean;
}

interface ModelPickerProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  dialect: string;
  onDialectChange: (dialect: string) => void;
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
  visibleModels?: ModelInfo[];
  className?: string;
}

// Provider icons and colors
const providerConfig: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  openai: { icon: Bot, color: 'text-green-500', label: 'OpenAI' },
  google: { icon: Sparkles, color: 'text-blue-500', label: 'Google' },
  anthropic: { icon: Flame, color: 'text-orange-500', label: 'Anthropic' },
};

// Legacy mode configuration (fallback)
const modes = [
  { id: 'fast' as ChatMode, label: 'Fast', icon: Zap, color: 'text-green-500' },
  { id: 'standard' as ChatMode, label: 'Standard', icon: Sparkles, color: 'text-blue-500' },
  { id: 'deep' as ChatMode, label: 'Deep', icon: Brain, color: 'text-purple-500' },
  { id: 'pro' as ChatMode, label: 'Pro', icon: Crown, color: 'text-amber-500' },
  { id: 'research' as ChatMode, label: 'Research', icon: Search, color: 'text-sky-500' },
  { id: 'image' as ChatMode, label: 'Image', icon: Image, color: 'text-pink-500' },
];

const dialects = [
  { id: 'auto', label: 'Auto', labelAr: 'تلقائي', sample: '(موصى به)', description: 'Detect from conversation' },
  { id: 'msa', label: 'MSA (Fusha)', labelAr: 'الفصحى', sample: 'كيف حالك؟', description: 'Modern Standard Arabic' },
  { id: 'egyptian', label: 'Egyptian', labelAr: 'مصري', sample: 'ازيك؟', description: 'Egyptian dialect' },
  { id: 'levantine', label: 'Levantine', labelAr: 'شامي', sample: 'كيفك؟', description: 'Syrian/Lebanese' },
  { id: 'gulf', label: 'Gulf', labelAr: 'خليجي', sample: 'شلونك؟', description: 'UAE/Saudi/Qatar' },
  { id: 'maghrebi', label: 'Maghrebi', labelAr: 'مغاربي', sample: 'لاباس؟', description: 'Moroccan/Algerian' },
];

export function ModelPicker({ 
  mode, 
  onModeChange, 
  dialect, 
  onDialectChange,
  currentModel,
  onModelChange,
  visibleModels = [],
  className 
}: ModelPickerProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const activeMode = modes.find((m) => m.id === mode) || modes[0];
  const activeDialect = dialects.find((d) => d.id === dialect) || dialects[0];
  
  // Find current model info
  const currentModelInfo = visibleModels.find(m => m.id === currentModel);
  const currentProvider = currentModelInfo ? providerConfig[currentModelInfo.provider] : null;

  // Use model-based picker if models are available and onModelChange is provided
  const useModelPicker = visibleModels.length > 0 && onModelChange;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Free</Badge>;
      case 'premium':
        return (
          <Badge className="text-[10px] px-1.5 py-0 font-medium bg-gradient-to-r from-violet-500/90 to-purple-600/90 border-0 shadow-sm">
            <Crown className="h-2.5 w-2.5 me-0.5" />
            Pro
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex items-center gap-3 flex-wrap", isRTL && "flex-row-reverse", className)}>
      <ModelHelpPanel open={isHelpOpen} onOpenChange={setIsHelpOpen} />

      <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
        {useModelPicker ? (
          // New model-based picker
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-8 gap-2 bg-background/50 backdrop-blur-sm border-dashed",
                  isRTL ? "rounded-s-none border-s-0" : "rounded-e-none border-e-0",
                  isRTL && "flex-row-reverse"
                )}
              >
                {currentProvider && (
                  <currentProvider.icon className={cn("h-4 w-4", currentProvider.color)} />
                )}
                <span className="text-xs font-medium max-w-[120px] truncate">
                  {isRTL ? currentModelInfo?.nameAr : currentModelInfo?.name || t('chat.selectModel')}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-[280px]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('chat.selectModel') || 'Select Model'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Group by provider */}
              {['openai', 'google', 'anthropic'].map(provider => {
                const providerModels = visibleModels.filter(m => m.provider === provider && m.available);
                if (providerModels.length === 0) return null;
                
                const config = providerConfig[provider];
                return (
                  <div key={provider}>
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground flex items-center gap-1 py-1">
                      <config.icon className={cn("h-3 w-3", config.color)} />
                      {config.label}
                    </DropdownMenuLabel>
                    {providerModels.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => onModelChange(model.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <div className="flex-1">
                          <span className="text-sm">{isRTL ? model.nameAr : model.name}</span>
                          <p className="text-[10px] text-muted-foreground">{model.description}</p>
                        </div>
                        {getTierBadge(model.tier)}
                        {currentModel === model.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Legacy mode-based picker
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-8 gap-2 bg-background/50 backdrop-blur-sm border-dashed",
                  isRTL ? "rounded-s-none border-s-0" : "rounded-e-none border-e-0",
                  isRTL && "flex-row-reverse"
                )}
              >
                <activeMode.icon className={cn("h-4 w-4", activeMode.color)} />
                <span className="text-xs font-medium">{activeMode.label}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-[200px]">
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
        )}
        
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-8 w-8 border-dashed bg-background/50 backdrop-blur-sm px-0",
            isRTL ? "rounded-e-none" : "rounded-s-none"
          )}
          onClick={() => setIsHelpOpen(true)}
          title="What changes?"
        >
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>

      {/* Dialect picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("h-8 gap-2 text-muted-foreground hover:text-foreground", isRTL && "flex-row-reverse")}
          >
            <span className="text-xs font-medium">
              {isRTL ? activeDialect.labelAr : activeDialect.label}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-[220px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('settings.dialect') || 'Dialect'}
          </DropdownMenuLabel>
          {dialects.map((d) => (
            <DropdownMenuItem
              key={d.id}
              onClick={() => onDialectChange(d.id)}
              className="gap-2 cursor-pointer flex-col items-start"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{isRTL ? d.labelAr : d.label}</span>
                {dialect === d.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
              <span className="text-xs text-muted-foreground" dir="rtl">{d.sample}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground ms-auto">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        {t('common.activeNow') || 'Active now'}
      </div>
    </div>
  );
}
