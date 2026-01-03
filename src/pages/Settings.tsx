import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type DialectPreset = 'msa' | 'egyptian' | 'gulf' | 'levantine' | 'maghrebi';

const dialects: { value: DialectPreset; labelEn: string; labelAr: string }[] = [
  { value: 'msa', labelEn: 'Modern Standard Arabic (فصحى)', labelAr: 'العربية الفصحى' },
  { value: 'egyptian', labelEn: 'Egyptian (مصري)', labelAr: 'المصرية' },
  { value: 'gulf', labelEn: 'Gulf (خليجي)', labelAr: 'الخليجية' },
  { value: 'levantine', labelEn: 'Levantine (شامي)', labelAr: 'الشامية' },
  { value: 'maghrebi', labelEn: 'Maghrebi (مغربي)', labelAr: 'المغاربية' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [dialect, setDialect] = useState<DialectPreset>('msa');
  const [globalMemory, setGlobalMemory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_dialect, global_memory_enabled')
        .eq('id', user.id)
        .single();

      if (data) {
        setDialect(data.preferred_dialect || 'msa');
        setGlobalMemory(data.global_memory_enabled ?? true);
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        preferred_dialect: dialect,
        global_memory_enabled: globalMemory,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error(t('errors.updateProfile', 'Failed to save preferences'));
    } else {
      toast.success(t('messages.preferencesSaved', 'Preferences saved'));
    }
    setIsSaving(false);
  };

  const isArabic = i18n.language === 'ar';

  return (
    <MainLayout title={t('settings.title')}>
      <div className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto">
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="text-muted-foreground text-sm md:text-lg">
            {t('settings.description')}
          </p>
        </div>

        <div className="grid gap-4 md:gap-6 max-w-2xl">
          {/* Language */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('common.language')}</CardTitle>
              <CardDescription>
                {t('common.selectLanguage')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('common.language')}</Label>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          {/* Dialect Preference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('settings.dialect', 'Arabic Dialect')}</CardTitle>
              <CardDescription>
                {t('settings.dialectDesc', 'Choose your preferred Arabic dialect for AI responses.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label>{t('settings.preferredDialect', 'Preferred Dialect')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.dialectHelp', 'AI will respond in this dialect when Arabic is detected.')}
                  </p>
                </div>
                <Select value={dialect} onValueChange={(v) => setDialect(v as DialectPreset)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dialects.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {isArabic ? d.labelAr : d.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Memory */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('settings.memory', 'Memory')}</CardTitle>
              <CardDescription>
                {t('settings.memoryDesc', 'Control how AI remembers information across conversations.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.globalMemory', 'Global Memory')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.globalMemoryDesc', 'Allow AI to use approved memories across all conversations.')}
                  </p>
                </div>
                <Switch
                  checked={globalMemory}
                  onCheckedChange={setGlobalMemory}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('settings.appearance')}</CardTitle>
              <CardDescription>
                {t('settings.appearanceDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('common.darkMode')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.themeDesc')}
                  </p>
                </div>
                <Switch
                  checked={document.documentElement.classList.contains('dark')}
                  onCheckedChange={() => document.documentElement.classList.toggle('dark')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('settings.notifications')}</CardTitle>
              <CardDescription>
                {t('settings.notificationsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.emailNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.emailNotificationsDesc')}
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
