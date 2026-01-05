import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { MobileNav } from '@/components/mobile/MobileNav';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { OfflineBanner } from './OfflineBanner';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  hideMobileNav?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export function MainLayout({ children, title, hideMobileNav }: MainLayoutProps) {
  // Default to collapsed on first visit
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === null ? true : stored === 'true';
  });
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const location = useLocation();

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleNewChat = () => {
    navigate('/chat');
  };

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <OfflineBanner />
        <MobileHeader title={title} />
        <main className="flex-1 flex flex-col overflow-hidden pb-20">
          {children}
        </main>
        {!hideMobileNav && <MobileNav onNewChat={handleNewChat} />}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <OfflineBanner />
        <Header />
        {children}
      </main>
    </div>
  );
}
