import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('settings.description')}
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.language')}</CardTitle>
              <CardDescription>
                {t('common.selectLanguage')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('common.language')}</Label>
                  <div className="text-sm text-muted-foreground">
                    {t('common.selectLanguage')}
                  </div>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance')}</CardTitle>
              <CardDescription>
                {t('settings.appearanceDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('common.darkMode')}</Label>
                  <div className="text-sm text-muted-foreground">
                    {t('settings.themeDesc')}
                  </div>
                </div>
                <Switch
                  checked={document.documentElement.classList.contains('dark')}
                  onCheckedChange={() => document.documentElement.classList.toggle('dark')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notifications')}</CardTitle>
              <CardDescription>
                {t('settings.notificationsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                  <Label>{t('settings.emailNotifications')}</Label>
                  <div className="text-sm text-muted-foreground">
                    {t('settings.emailNotificationsDesc')}
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

           <div className="flex justify-end">
              <Button>{t('common.saveChanges')}</Button>
           </div>
        </div>
      </div>
    </MainLayout>
  );
}
