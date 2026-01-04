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
import { Globe, Shield, Smartphone, Palette, Save, Zap, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const AVAILABLE_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini Flash (Fast)', description: 'Quick responses, lower cost' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini Pro (Smart)', description: 'Best for complex tasks' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Balanced)', description: 'Good balance of speed and quality' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)', description: 'Highest quality, slower' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  // Local state for settings
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState(i18n.language);

  // New settings
  const [dialect, setDialect] = useState('msa');
  const [numerals, setNumerals] = useState('western');
  const [rtlOverride, setRtlOverride] = useState(false);
  const [defaultModel, setDefaultModel] = useState('google/gemini-2.5-flash');
  const [memoryEnabled, setMemoryEnabled] = useState(true);

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
    // document.dir is handled by i18n generally, but let's ensure it matches logic
    if (!rtlOverride) {
        document.dir = i18n.dir(lang);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl py-6 space-y-8 animate-in fade-in duration-500" dir={i18n.dir()}>
        <div className="flex items-center justify-between">
          <div>
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
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="language">{t('settings.languageRegion')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
            <TabsTrigger value="models">{t('settings.models')}</TabsTrigger>
            <TabsTrigger value="privacy">{t('settings.privacy')}</TabsTrigger>
          </TabsList>

          <TabsContent value="language" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle>{t('settings.language')}</CardTitle>
                </div>
                <CardDescription>{t('settings.languageDesc')}</CardDescription>
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

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
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
                <div className="flex items-center gap-2">
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
                 <div className="flex items-center gap-2">
                   <Zap className="h-5 w-5 text-primary" />
                   <CardTitle>{t('settings.defaultModel')}</CardTitle>
                 </div>
                 <CardDescription>{t('settings.defaultModelDesc')}</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>{t('settings.model')}</Label>
                    <Select value={defaultModel} onValueChange={setDefaultModel}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <span>{model.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      {AVAILABLE_MODELS.find(m => m.value === defaultModel)?.description || t('settings.modelTradeoff')}
                    </p>
                  </div>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6 mt-6">
             <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>{t('settings.privacySecurity')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
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
                    <div className="flex gap-2">
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
