import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center space-y-6 max-w-md animate-in fade-in zoom-in duration-500">
        <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
          <FileQuestion className="h-12 w-12 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <p className="text-xl font-medium">{t('errors.pageNotFound') || 'Page Not Found'}</p>
          <p className="text-muted-foreground">
            {t('errors.pageNotFoundDesc') || "The page you are looking for doesn't exist or has been moved."}
          </p>
        </div>

        <Button onClick={() => window.location.href = '/'} className="gap-2">
          <Home className="h-4 w-4" />
          {t('sidebar.home') || 'Return Home'}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
