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
  { id: 'msa', label: 'MSA (Fusha)', labelAr: 'الفصحى' },
  { id: 'egyptian', label: 'Egyptian', labelAr: 'مصري' },
  { id: 'levantine', label: 'Levantine', labelAr: 'شامي' },
  { id: 'gulf', label: 'Gulf', labelAr: 'خليجي' },
  { id: 'maghrebi', label: 'Maghrebi', labelAr: 'مغاربي' },
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
        return <Badge variant="secondary" className="text-[10px] px-1 py-0">Free</Badge>;
      case 'premium':
        return <Badge className="text-[10px] px-1 py-0 bg-gradient-to-r from-amber-500 to-orange-500">Pro</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ModelHelpPanel open={isHelpOpen} onOpenChange={setIsHelpOpen} />

      <div className="flex items-center">
        {useModelPicker ? (
          // New model-based picker
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 bg-background/50 backdrop-blur-sm border-dashed rounded-e-none border-e-0">
                {currentProvider && (
                  <currentProvider.icon className={cn("h-4 w-4", currentProvider.color)} />
                )}
                <span className="text-xs font-medium max-w-[120px] truncate">
                  {isRTL ? currentModelInfo?.nameAr : currentModelInfo?.name || t('chat.selectModel')}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
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
              <Button variant="outline" size="sm" className="h-8 gap-2 bg-background/50 backdrop-blur-sm border-dashed rounded-e-none border-e-0">
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
        )}
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-s-none border-dashed bg-background/50 backdrop-blur-sm px-0"
          onClick={() => setIsHelpOpen(true)}
          title="What changes?"
        >
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>

      {/* Dialect picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
            <span className="text-xs font-medium">
              {isRTL ? activeDialect.labelAr : activeDialect.label}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('settings.dialect') || 'Dialect'}
          </DropdownMenuLabel>
          {dialects.map((d) => (
            <DropdownMenuItem
              key={d.id}
              onClick={() => onDialectChange(d.id)}
              className="gap-2 cursor-pointer"
            >
              <span className="flex-1">{isRTL ? d.labelAr : d.label}</span>
              {dialect === d.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
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
