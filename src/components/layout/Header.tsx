import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();
  const { t } = useTranslation();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  const getBreadcrumbName = (segment: string) => {
    switch (segment) {
      case 'chat': return t('sidebar.chat');
      case 'projects': return t('sidebar.projects');
      case 'memory': return t('sidebar.memory');
      case 'images': return t('sidebar.images');
      case 'research': return t('sidebar.research');
      case 'usage': return t('sidebar.usage');
      case 'history': return t('sidebar.history');
      case 'settings': return t('settings.title');
      default: return segment;
    }
  };

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center gap-2 sticky top-0 z-10">
      <Link
        to="/"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathSegments.map((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
        const isLast = index === pathSegments.length - 1;
        const name = getBreadcrumbName(segment);

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
            <Link
              to={path}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                isLast ? "text-foreground cursor-default pointer-events-none" : "text-muted-foreground"
              )}
            >
              {name}
            </Link>
          </div>
        );
      })}
    </header>
  );
}
