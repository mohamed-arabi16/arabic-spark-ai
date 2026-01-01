import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  MessageSquare,
  FolderOpen,
  Image,
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  Plus,
  Moon,
  Sun,
} from 'lucide-react';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { icon: MessageSquare, label: 'Chat', href: '/' },
    { icon: FolderOpen, label: 'Projects', href: '/projects' },
    { icon: Image, label: 'Images', href: '/images' },
    { icon: Search, label: 'Research', href: '/research' },
  ];

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">AI Workspace</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'ml-auto h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && 'hidden'
          )}
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* New chat button */}
      <div className="p-3">
        <Button
          className={cn(
            'w-full gap-2 bg-primary hover:bg-primary/90',
            collapsed ? 'px-0' : ''
          )}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New Chat</span>}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Recent conversations placeholder */}
        {!collapsed && (
          <div className="mt-6">
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recent
            </p>
            <div className="space-y-1">
              {['Marketing campaign ideas', 'Code review help', 'Arabic translation'].map((chat, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-left truncate"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
                  <span className="truncate">{chat}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && 'justify-center px-0'
          )}
          onClick={toggleTheme}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {!collapsed && <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>}
        </Button>

        {/* Settings */}
        <Link to="/settings">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent',
              collapsed && 'justify-center px-0'
            )}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </Button>
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed && 'justify-center px-0'
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse button (visible when collapsed) */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="mx-auto mb-3 h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </Button>
      )}
    </aside>
  );
}
