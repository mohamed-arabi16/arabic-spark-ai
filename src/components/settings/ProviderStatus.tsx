import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  Settings,
  Zap,
  Bot,
  Sparkles,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProviderInfo {
  id: 'openai' | 'google' | 'anthropic';
  name: string;
  nameAr: string;
  icon: typeof Bot;
  color: string;
  isConfigured: boolean;
  lastChecked?: Date;
  lastError?: string;
  isEnabled?: boolean;
  spendingLimit?: number;
}

interface ProviderStatusProps {
  providers: {
    openai: boolean;
    google: boolean;
    anthropic: boolean;
  };
  onTestProvider?: (provider: string) => Promise<{ valid: boolean; error?: string }>;
  onProviderSettingsChange?: (provider: string, settings: { enabled?: boolean; spendingLimit?: number }) => void;
}

const providerConfig: ProviderInfo[] = [
  { 
    id: 'openai', 
    name: 'OpenAI', 
    nameAr: 'أوبن إيه آي', 
    icon: Bot, 
    color: 'text-green-500',
    isConfigured: false,
  },
  { 
    id: 'google', 
    name: 'Google', 
    nameAr: 'جوجل', 
    icon: Sparkles, 
    color: 'text-blue-500',
    isConfigured: false,
  },
  { 
    id: 'anthropic', 
    name: 'Anthropic', 
    nameAr: 'أنثروبيك', 
    icon: Flame, 
    color: 'text-orange-500',
    isConfigured: false,
  },
];

export function ProviderStatus({ 
  providers,
  onTestProvider,
  onProviderSettingsChange,
}: ProviderStatusProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerSettings, setProviderSettings] = useState<Record<string, { enabled: boolean; spendingLimit: number }>>({
    openai: { enabled: true, spendingLimit: 50 },
    google: { enabled: true, spendingLimit: 50 },
    anthropic: { enabled: true, spendingLimit: 50 },
  });
  const [lastChecked, setLastChecked] = useState<Record<string, Date>>({});
  const [lastErrors, setLastErrors] = useState<Record<string, string>>({});

  const handleTestProvider = async (providerId: string) => {
    if (!onTestProvider) {
      toast.info(t('providers.testNotAvailable'));
      return;
    }

    setTestingProvider(providerId);
    try {
      const result = await onTestProvider(providerId);
      setLastChecked(prev => ({ ...prev, [providerId]: new Date() }));
      
      if (result.valid) {
        setLastErrors(prev => {
          const { [providerId]: _, ...rest } = prev;
          return rest;
        });
        toast.success(t('providers.testSuccess', { provider: providerId }));
      } else {
        setLastErrors(prev => ({ ...prev, [providerId]: result.error || 'Unknown error' }));
        toast.error(t('providers.testFailed', { error: result.error }));
      }
    } catch (error) {
      setLastErrors(prev => ({ 
        ...prev, 
        [providerId]: error instanceof Error ? error.message : 'Test failed' 
      }));
      toast.error(t('providers.testFailed', { error: 'Connection failed' }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleEnabled = (providerId: string, enabled: boolean) => {
    const newSettings = { ...providerSettings[providerId], enabled };
    setProviderSettings(prev => ({ ...prev, [providerId]: newSettings }));
    onProviderSettingsChange?.(providerId, { enabled });
    toast.success(enabled ? t('providers.enabled') : t('providers.disabled'));
  };

  const handleSpendingLimitChange = (providerId: string, limit: number) => {
    const newSettings = { ...providerSettings[providerId], spendingLimit: limit };
    setProviderSettings(prev => ({ ...prev, [providerId]: newSettings }));
  };

  const handleSaveSpendingLimit = (providerId: string) => {
    onProviderSettingsChange?.(providerId, { spendingLimit: providerSettings[providerId].spendingLimit });
    toast.success(t('providers.limitSaved'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          <Zap className="h-5 w-5 text-primary" />
          {t('providers.title')}
        </CardTitle>
        <CardDescription>{t('providers.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providerConfig.map((provider, index) => {
          const isConfigured = providers[provider.id];
          const Icon = provider.icon;
          const settings = providerSettings[provider.id];
          const lastCheck = lastChecked[provider.id];
          const lastError = lastErrors[provider.id];
          const isTesting = testingProvider === provider.id;

          return (
            <div key={provider.id}>
              {index > 0 && <Separator className="my-4" />}
              <div className="space-y-3">
                {/* Header row */}
                <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                  <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                    <Icon className={cn('h-5 w-5', provider.color)} />
                    <span className="font-medium">{isRTL ? provider.nameAr : provider.name}</span>
                    {isConfigured ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        <Check className="h-3 w-3 me-1" />
                        {t('providers.connected')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <AlertCircle className="h-3 w-3 me-1" />
                        {t('providers.notConfigured')}
                      </Badge>
                    )}
                  </div>
                  
                  {isConfigured && (
                    <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                      <Label className="text-xs text-muted-foreground">{t('providers.enable')}</Label>
                      <Switch
                        checked={settings.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(provider.id, checked)}
                      />
                    </div>
                  )}
                </div>

                {/* Status and actions */}
                {isConfigured && (
                  <div className="ps-7 space-y-3">
                    {/* Test button and status */}
                    <div className={cn('flex items-center gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestProvider(provider.id)}
                        disabled={isTesting}
                        className="h-7 text-xs"
                      >
                        {isTesting ? (
                          <Loader2 className="h-3 w-3 me-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 me-1" />
                        )}
                        {t('providers.testKey')}
                      </Button>
                      
                      {lastCheck && (
                        <span className="text-[10px] text-muted-foreground">
                          {t('providers.lastChecked')}: {lastCheck.toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {/* Error display */}
                    {lastError && (
                      <div className="text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1">
                        {lastError}
                      </div>
                    )}

                    {/* Spending limit */}
                    <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                      <Label className="text-xs whitespace-nowrap">{t('providers.spendingLimit')}:</Label>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={settings.spendingLimit}
                          onChange={(e) => handleSpendingLimitChange(provider.id, parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs ps-5 w-full"
                          min={0}
                          step={5}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleSaveSpendingLimit(provider.id)}
                      >
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
