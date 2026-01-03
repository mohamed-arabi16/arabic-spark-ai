import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, Project, ProjectInsert, ProjectUpdate } from '@/hooks/useProjects';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
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
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  LayoutDashboard,
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
  BarChart,
  Briefcase,
  Clock,
  Brain,
} from 'lucide-react';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const { projects, currentProject, selectProject, fetchProjects, createProject } = useProjects();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { icon: LayoutDashboard, label: t('sidebar.home'), href: '/' },
    { icon: MessageSquare, label: t('sidebar.chat'), href: '/chat' },
    { icon: FolderOpen, label: t('sidebar.projects'), href: '/projects' },
    { icon: Brain, label: t('sidebar.memory'), href: '/memory' },
    { icon: Image, label: t('sidebar.images'), href: '/images' },
    { icon: Search, label: t('sidebar.research'), href: '/research' },
    { icon: BarChart, label: t('sidebar.usage'), href: '/usage' },
    { icon: Clock, label: t('sidebar.history'), href: '/history' },
  ];

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  const handleProjectCreate = async (data: ProjectInsert | ProjectUpdate) => {
      await createProject(data as ProjectInsert);
      setIsProjectDialogOpen(false);
  };

  const handleProjectSelect = (projectId: string) => {
    selectProject(projectId);
    navigate(`/chat?project=${projectId}`);
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border gap-2">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground whitespace-nowrap">{t('sidebar.workspace')}</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'ms-auto h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent shrink-0',
            collapsed && 'hidden'
          )}
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>

      {/* Project Selector & New Project */}
      {!collapsed && (
        <div className="px-3 pt-3 space-y-2">
          <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('sidebar.workspace')}</span>
               <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setIsProjectDialogOpen(true)}
                title={t('projects.newProject')}
              >
                <Plus className="h-3 w-3" />
              </Button>
          </div>
          {projects.length > 0 ? (
            <Select
              value={currentProject?.id}
              onValueChange={handleProjectSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('projects.title')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span>{p.icon || '💬'}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
             <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsProjectDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('projects.newProject')}
             </Button>
          )}
        </div>
      )}

      {collapsed && (
          <div className="p-3 flex justify-center">
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsProjectDialogOpen(true)}
                title={t('projects.newProject')}
             >
                 <Briefcase className="h-5 w-5" />
             </Button>
          </div>
      )}


      {/* New chat button */}
      <div className="p-3">
        <Button
          className={cn(
            'w-full gap-2 bg-primary hover:bg-primary/90',
            collapsed ? 'px-0' : ''
          )}
          onClick={() => navigate('/chat')}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>{t('chat.newChat')}</span>}
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
              {t('sidebar.recent')}
            </p>
            <div className="space-y-1">
              {['Marketing campaign ideas', 'Code review help', 'Arabic translation'].map((chat, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-start truncate"
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
          {!collapsed && <span>{isDark ? t('common.darkMode') : t('common.lightMode')}</span>}
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
            {!collapsed && <span>{t('common.settings')}</span>}
          </Button>
        </Link>

        {/* Language Switcher */}
        {!collapsed && (
          <div className="px-3 flex items-center justify-between">
             <span className="text-sm text-muted-foreground">{t('common.language')}</span>
             <LanguageSwitcher />
          </div>
        )}

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
              <LogOut className="h-4 w-4 me-2" />
              {t('sidebar.signOut')}
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
          <ChevronLeft className="h-4 w-4 rotate-180 rtl:rotate-0" />
        </Button>
      )}

      <ProjectDialog
          open={isProjectDialogOpen}
          onOpenChange={setIsProjectDialogOpen}
          onSubmit={handleProjectCreate}
      />
    </aside>
  );
}
