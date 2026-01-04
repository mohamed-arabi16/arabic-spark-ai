import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function MainLayout({ children, title, hideMobileNav }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();

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
