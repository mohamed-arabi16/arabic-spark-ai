import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Shield, Palette, Save, Zap, Loader2, AlertCircle, Bot, Sparkles, Flame, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useModelSettings } from '@/hooks/useModelSettings';

// Provider icons and colors
const providerConfig: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  openai: { icon: Bot, color: 'text-green-500', label: 'OpenAI' },
  google: { icon: Sparkles, color: 'text-blue-500', label: 'Google' },
  anthropic: { icon: Flame, color: 'text-orange-500', label: 'Anthropic' },
};

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.dir() === 'rtl';

  // Model settings from hook
  const {
    settings: modelSettings,
    availableModels,
    isLoading: isLoadingModels,
    isSaving,
    saveSettings,
    toggleModelEnabled,
    toggleModelVisible,
  } = useModelSettings();

  // Local state for other settings
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState(i18n.language);
  const [dialect, setDialect] = useState('msa');
  const [numerals, setNumerals] = useState('western');
  const [rtlOverride, setRtlOverride] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  useEffect(() => {
    // Load persisted settings
    const storedDialect = localStorage.getItem('app_dialect');
    if (storedDialect) setDialect(storedDialect);

    const storedNumerals = localStorage.getItem('app_numerals');
    if (storedNumerals) setNumerals(storedNumerals);

    const storedRtl = localStorage.getItem('app_rtl_override');
    if (storedRtl) setRtlOverride(storedRtl === 'true');

    const storedMemory = localStorage.getItem('app_memory_enabled');
    if (storedMemory) setMemoryEnabled(storedMemory === 'true');
  }, [user]);

  const handleSave = async () => {
    localStorage.setItem('app_dialect', dialect);
    localStorage.setItem('app_numerals', numerals);
    localStorage.setItem('app_rtl_override', rtlOverride.toString());
    localStorage.setItem('app_memory_enabled', memoryEnabled.toString());

    // Apply immediate effects
    if (rtlOverride && language === 'en') {
      document.dir = 'rtl';
    } else if (!rtlOverride && language === 'en') {
      document.dir = 'ltr';
    }

    toast.success(t('settings.saved'));
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    if (!rtlOverride) {
      document.dir = i18n.dir(lang);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Badge variant="secondary" className="text-xs">{t('settings.tierFree')}</Badge>;
      case 'standard':
        return <Badge variant="outline" className="text-xs">{t('settings.tierStandard')}</Badge>;
      case 'premium':
        return <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500">{t('settings.tierPremium')}</Badge>;
      default:
        return null;
    }
  };

  const getProviderIcon = (provider: string) => {
    const config = providerConfig[provider];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  // Group models by capability
  const chatModels = availableModels?.chatModels || [];
  const imageModels = availableModels?.imageModels || [];
  const researchModels = availableModels?.researchModels || [];
  const providers = availableModels?.providers || { openai: false, google: false, anthropic: false };

  return (
    <MainLayout>
      <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto" dir={i18n.dir()}>
        {/* Page Header */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('settings.subtitle')}
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.save')}
          </Button>
        </div>

        <Tabs defaultValue="models" className="w-full">
          <TabsList className={`w-full sm:w-auto ${isRTL ? 'sm:ms-auto' : ''}`}>
            <TabsTrigger value="models">{t('settings.models')}</TabsTrigger>
            <TabsTrigger value="language">{t('settings.languageRegion')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
            <TabsTrigger value="privacy">{t('settings.privacy')}</TabsTrigger>
          </TabsList>

          {/* Models Tab - New comprehensive model management */}
          <TabsContent value="models" className="space-y-6 mt-6">
            {/* Provider Status */}
            <div className="glass rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {t('settings.providerStatus') || 'AI Providers'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('settings.providerStatusDesc') || 'Connected AI providers and their status'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(providers).map(([provider, isConfigured]) => {
                  const config = providerConfig[provider];
                  if (!config) return null;
                  return (
                    <div 
                      key={provider} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl glass ${isConfigured ? 'border-primary/30' : ''}`}
                    >
                      {getProviderIcon(provider)}
                      <span className="font-medium">{config.label}</span>
                      {isConfigured ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Default Models by Function */}
            <div className="glass rounded-2xl p-6">
              <div className="mb-5">
                <h3 className="text-lg font-semibold">{t('settings.defaultModels') || 'Default Models'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('settings.defaultModelsDesc') || 'Choose the default model for each function'}
                </p>
              </div>
              {isLoadingModels ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading models...</span>
                </div>
              ) : (
                <div className="grid gap-5">
                  {/* Chat Default */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label>💬 {t('settings.dailyChat')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.dailyChatDesc')}</p>
                    </div>
                    <Select 
                      value={modelSettings.default_chat_model} 
                      onValueChange={(v) => saveSettings({ default_chat_model: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chatModels.filter(m => m.available).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              {getProviderIcon(model.provider)}
                              <span>{model.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Deep Think Default */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label>🧠 {t('settings.deepAnalysis')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.deepAnalysisDesc')}</p>
                    </div>
                    <Select 
                      value={modelSettings.default_deep_think_model} 
                      onValueChange={(v) => saveSettings({ default_deep_think_model: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chatModels.filter(m => m.available && m.capabilities?.includes('deep_think')).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              {getProviderIcon(model.provider)}
                              <span>{model.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Research Default */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label>🔍 {t('settings.research')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.researchDesc')}</p>
                    </div>
                    <Select 
                      value={modelSettings.default_research_model} 
                      onValueChange={(v) => saveSettings({ default_research_model: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...chatModels, ...researchModels].filter(m => m.available && m.capabilities?.includes('deep_research')).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              {getProviderIcon(model.provider)}
                              <span>{model.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Image Default */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label>🖼️ {t('settings.images')}</Label>
                      <p className="text-sm text-muted-foreground">{t('settings.imagesDesc')}</p>
                    </div>
                    <Select 
                      value={modelSettings.default_image_model} 
                      onValueChange={(v) => saveSettings({ default_image_model: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {imageModels.filter(m => m.available).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              {getProviderIcon(model.provider)}
                              <span>{model.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Visible Models in Chat */}
            <div className="glass rounded-2xl p-6">
              <div className="mb-5">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  {t('settings.visibleInChat') || 'Visible in Chat'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('settings.visibleInChatDesc') || 'Choose which models appear in the chat model picker (max 5)'}
                </p>
              </div>
              {isLoadingModels ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {modelSettings.visible_chat_models.length}/5 models selected
                  </p>
                  
                  {/* Group by provider */}
                  {['openai', 'google', 'anthropic'].map(provider => {
                    const providerModels = chatModels.filter(m => m.provider === provider);
                    if (providerModels.length === 0) return null;
                    const config = providerConfig[provider];
                    
                    return (
                      <div key={provider} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {getProviderIcon(provider)}
                          {config?.label}
                          {!providers[provider as keyof typeof providers] && (
                            <Badge variant="outline" className="text-xs">Not configured</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ps-6">
                          {providerModels.map((model) => {
                            const isVisible = modelSettings.visible_chat_models.includes(model.id);
                            const isEnabled = modelSettings.enabled_models.includes(model.id);
                            const isDisabled = !model.available || (!isVisible && modelSettings.visible_chat_models.length >= 5);
                            
                            return (
                              <div
                                key={model.id}
                                className={`flex items-center gap-3 p-3 rounded-xl glass cursor-pointer transition-all ${
                                  isVisible ? 'ring-2 ring-primary/50' : 'hover:bg-foreground/5'
                                } ${isDisabled && !isVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => !isDisabled && toggleModelVisible(model.id)}
                              >
                                <Checkbox 
                                  checked={isVisible} 
                                  disabled={isDisabled && !isVisible}
                                  className="pointer-events-none"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate">{model.name}</span>
                                  <p className="text-xs text-muted-foreground truncate">{model.description}</p>
                                </div>
                                {getTierBadge(model.tier)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Language Tab */}
          <TabsContent value="language" className="space-y-6 mt-6">
            <div className="glass rounded-2xl p-6">
              <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{t('settings.language')}</h3>
              </div>
              <p className={`text-sm text-muted-foreground mb-5 ${isRTL ? 'text-right' : ''}`}>{t('settings.languageDesc')}</p>
              
              <div className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="language">{t('settings.selectLanguage')}</Label>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="language" className="w-full sm:w-[250px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-border/50" />

                <div className="grid gap-2">
                  <Label htmlFor="dialect">{t('settings.dialect')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.dialectHelp')}</p>
                  <Select value={dialect} onValueChange={setDialect}>
                    <SelectTrigger id="dialect" className="w-full sm:w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msa">{t('settings.dialectMSA')}</SelectItem>
                      <SelectItem value="gulf">{t('settings.dialectGulf')}</SelectItem>
                      <SelectItem value="levantine">{t('settings.dialectLevantine')}</SelectItem>
                      <SelectItem value="egyptian">{t('settings.dialectEgyptian')}</SelectItem>
                      <SelectItem value="maghrebi">{t('settings.dialectMaghrebi')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-border/50" />

                <div className="grid gap-2">
                  <Label htmlFor="numerals">{t('settings.numerals')}</Label>
                  <Select value={numerals} onValueChange={setNumerals}>
                    <SelectTrigger id="numerals" className="w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="western">123 (Western)</SelectItem>
                      <SelectItem value="eastern">١٢٣ (Eastern/Arabic-Indic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-border/50" />

                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`space-y-0.5 ${isRTL ? 'text-right' : ''}`}>
                    <Label>{t('settings.forceRTL')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.forceRTLDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={rtlOverride}
                    onCheckedChange={setRtlOverride}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Palette className="h-5 w-5 text-primary" />
                  <CardTitle>{t('settings.theme')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>{t('settings.selectTheme')}</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.light')}</SelectItem>
                      <SelectItem value="dark">{t('settings.dark')}</SelectItem>
                      <SelectItem value="system">{t('settings.system')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>{t('settings.privacySecurity')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`space-y-0.5 ${isRTL ? 'text-right' : ''}`}>
                    <Label>{t('settings.enableMemory')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.enableMemoryDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={memoryEnabled}
                    onCheckedChange={setMemoryEnabled}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>{t('settings.dataControls')}</Label>
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                      {t('settings.clearHistory')}
                    </Button>
                    <Button variant="outline">
                      {t('settings.exportData')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
