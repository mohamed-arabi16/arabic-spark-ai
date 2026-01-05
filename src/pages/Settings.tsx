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
import { Globe, Shield, Palette, Save, Zap, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface AvailableModel {
  id: string;
  name: string;
  description: string;
  tier: string;
  available: boolean;
}

interface ModelsResponse {
  chatModels: AvailableModel[];
  imageModels: AvailableModel[];
  hasOpenAI: boolean;
}

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`;

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.dir() === 'rtl';

  // Local state for settings
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState(i18n.language);

  // New settings
  const [dialect, setDialect] = useState('msa');
  const [numerals, setNumerals] = useState('western');
  const [rtlOverride, setRtlOverride] = useState(false);
  const [defaultModel, setDefaultModel] = useState('google/gemini-2.5-flash');
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  // Dynamic models from backend
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [hasOpenAI, setHasOpenAI] = useState(false);

  // Fetch available models from backend
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch(`${AI_GATEWAY_URL}?action=models`);
        if (response.ok) {
          const data: ModelsResponse = await response.json();
          // Only show available chat models
          setAvailableModels(data.chatModels.filter(m => m.available));
          setHasOpenAI(data.hasOpenAI);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // Fallback to default models
        setAvailableModels([
          { id: 'google/gemini-2.5-flash', name: 'Gemini Flash', description: 'Fast responses', tier: 'free', available: true },
          { id: 'google/gemini-2.5-pro', name: 'Gemini Pro', description: 'Best reasoning', tier: 'premium', available: true },
        ]);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    // Load persisted settings
    const storedDialect = localStorage.getItem('app_dialect');
    if (storedDialect) setDialect(storedDialect);

    const storedNumerals = localStorage.getItem('app_numerals');
    if (storedNumerals) setNumerals(storedNumerals);

    const storedRtl = localStorage.getItem('app_rtl_override');
    if (storedRtl) setRtlOverride(storedRtl === 'true');

    const storedModel = localStorage.getItem('app_default_model');
    if (storedModel) {
      setDefaultModel(storedModel);
    } else if (user?.user_metadata?.default_model) {
      setDefaultModel(user.user_metadata.default_model);
    }

    const storedMemory = localStorage.getItem('app_memory_enabled');
    if (storedMemory) setMemoryEnabled(storedMemory === 'true');
  }, [user]);

  const handleSave = async () => {
    localStorage.setItem('app_dialect', dialect);
    localStorage.setItem('app_numerals', numerals);
    localStorage.setItem('app_rtl_override', rtlOverride.toString());
    localStorage.setItem('app_default_model', defaultModel);
    localStorage.setItem('app_memory_enabled', memoryEnabled.toString());

    // Persist to user metadata
    const { error } = await supabase.auth.updateUser({
      data: { default_model: defaultModel }
    });

    if (error) {
      console.error('Failed to update user metadata:', error);
    }

    // Apply immediate effects where possible
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
        return <Badge variant="secondary" className="text-xs">Free</Badge>;
      case 'standard':
        return <Badge variant="outline" className="text-xs">Standard</Badge>;
      case 'premium':
        return <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500">Premium</Badge>;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl py-6 space-y-8 animate-in fade-in duration-500" dir={i18n.dir()}>
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('settings.subtitle')}
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {t('common.save')}
          </Button>
        </div>

        <Tabs defaultValue="language" className="w-full">
          <TabsList className={`grid w-full grid-cols-4 lg:w-[600px] ${isRTL ? 'lg:ms-auto' : ''}`}>
            <TabsTrigger value="language">{t('settings.languageRegion')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
            <TabsTrigger value="models">{t('settings.models')}</TabsTrigger>
            <TabsTrigger value="privacy">{t('settings.privacy')}</TabsTrigger>
          </TabsList>

          <TabsContent value="language" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle>{t('settings.language')}</CardTitle>
                </div>
                <CardDescription className={isRTL ? 'text-right' : ''}>{t('settings.languageDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="language">{t('settings.selectLanguage')}</Label>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="language" className="w-[250px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label htmlFor="dialect">{t('settings.dialect')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.dialectHelp')}</p>
                  <Select value={dialect} onValueChange={setDialect}>
                    <SelectTrigger id="dialect" className="w-[250px]">
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

                <Separator />

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

                <Separator />

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
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="models" className="space-y-6 mt-6">
             <Card>
               <CardHeader>
                 <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <Zap className="h-5 w-5 text-primary" />
                   <CardTitle>{t('settings.defaultModel')}</CardTitle>
                 </div>
                 <CardDescription className={isRTL ? 'text-right' : ''}>
                   {t('settings.defaultModelDesc')}
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 {isLoadingModels ? (
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="h-4 w-4 animate-spin" />
                     <span>Loading available models...</span>
                   </div>
                 ) : availableModels.length === 0 ? (
                   <div className="flex items-center gap-2 text-destructive">
                     <AlertCircle className="h-4 w-4" />
                     <span>No models available. Check API configuration.</span>
                   </div>
                 ) : (
                   <>
                     <div className="grid gap-2">
                       <Label>{t('settings.model')}</Label>
                       <Select value={defaultModel} onValueChange={setDefaultModel}>
                         <SelectTrigger className="w-[350px]">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {availableModels.map((model) => (
                             <SelectItem key={model.id} value={model.id}>
                               <div className="flex items-center gap-2">
                                 <span>{model.name}</span>
                                 {getTierBadge(model.tier)}
                               </div>
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       <p className="text-sm text-muted-foreground mt-2">
                         {availableModels.find(m => m.id === defaultModel)?.description || t('settings.modelTradeoff')}
                       </p>
                     </div>

                     {!hasOpenAI && (
                       <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-muted">
                         <p className="text-sm text-muted-foreground">
                           <strong>Note:</strong> OpenAI models (GPT-5) are not available. Add your OPENAI_API_KEY to enable them.
                         </p>
                       </div>
                     )}

                     <Separator className="my-4" />
                     
                     <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
                       <Label className="text-muted-foreground">{t('settings.modeOverride') || 'Chat Mode Override'}</Label>
                       <p className="text-sm text-muted-foreground">
                         {t('settings.modeOverrideDesc') || 'When you select a chat mode (Fast/Standard/Deep/Pro), it will use the optimal model for that mode, overriding your default selection.'}
                       </p>
                       <ul className="text-sm text-muted-foreground list-disc ps-4 mt-2 space-y-1">
                         <li><strong>Fast:</strong> Gemini Flash Lite</li>
                         <li><strong>Standard:</strong> Gemini Flash</li>
                         <li><strong>Deep:</strong> Gemini Pro</li>
                         <li><strong>Pro:</strong> GPT-5 (or Gemini Pro if OpenAI unavailable)</li>
                       </ul>
                     </div>
                   </>
                 )}
               </CardContent>
             </Card>
          </TabsContent>

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
