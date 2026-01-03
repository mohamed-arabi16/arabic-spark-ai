import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  Search, 
  FolderOpen, 
  Clock, 
  BarChart,
  Plus
} from 'lucide-react';

interface MobileNavProps {
  onNewChat?: () => void;
}

export function MobileNav({ onNewChat }: MobileNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: MessageSquare, label: t('sidebar.chat'), href: '/chat' },
    { icon: Search, label: t('sidebar.research'), href: '/research' },
    { icon: FolderOpen, label: t('sidebar.projects'), href: '/projects' },
    { icon: Clock, label: t('sidebar.history'), href: '/history' },
    { icon: BarChart, label: t('sidebar.usage'), href: '/usage' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* FAB - New Chat */}
        <button
          onClick={onNewChat || (() => navigate('/chat'))}
          className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>

        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
