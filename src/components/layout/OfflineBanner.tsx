import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between text-sm animate-in slide-in-from-top-full duration-300">
       <div className="flex items-center gap-2">
         <WifiOff className="h-4 w-4" />
         <span>{t('errors.offlineMessage') || 'You are currently offline. Changes may not be saved.'}</span>
       </div>
       <Button variant="outline" size="sm" className="h-7 text-destructive border-white/20 hover:bg-white/10" onClick={() => window.location.reload()}>
         {t('common.retry') || 'Retry'}
       </Button>
    </div>
  );
}
