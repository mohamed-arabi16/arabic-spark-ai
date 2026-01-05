import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, ProjectInsert, ProjectUpdate } from '@/hooks/useProjects';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
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
  MessageSquare,
  FolderOpen,
  Image as ImageIcon,
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

interface RecentConversation {
  id: string;
  title: string | null;
  updated_at: string;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const { projects, currentProject, selectProject, fetchProjects, createProject } = useProjects();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchRecentConversations = useCallback(async () => {
    if (!user) return;
    
    // Filter by current project, or show conversations without a project (General)
    let query = supabase
      .from('conversations')
      .select('id, title, updated_at, project_id')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(5);

    // If a project is selected, show only that project's conversations
    // Otherwise show conversations with no project (General workspace)
    if (currentProject) {
      query = query.eq('project_id', currentProject.id);
    } else {
      query = query.is('project_id', null);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRecentConversations(data);
    }
  }, [user, currentProject]);

  useEffect(() => {
    fetchRecentConversations();
  }, [fetchRecentConversations]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleProjectCreate = async (data: ProjectInsert | ProjectUpdate) => {
    await createProject(data as ProjectInsert);
    setIsProjectDialogOpen(false);
  };

  const handleProjectSelect = (projectId: string) => {
    selectProject(projectId);
    const projectRoutes = ['/chat', '/images', '/research', '/usage'];
    const isProjectRoute = projectRoutes.some(route => location.pathname.startsWith(route));

    if (isProjectRoute) {
      navigate(`${location.pathname}?project=${projectId}`);
    }
  };

  const userInitials = user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?';

  const projectTools = [
    { icon: MessageSquare, label: t('sidebar.chat'), href: `/chat${currentProject ? `?project=${currentProject.id}` : ''}` },
    { icon: Search, label: t('sidebar.research'), href: '/research' },
    { icon: ImageIcon, label: t('sidebar.images'), href: '/images' },
    { icon: BarChart, label: t('sidebar.usage'), href: '/usage' },
  ];

  const globalTools = [
    { icon: FolderOpen, label: t('sidebar.projects'), href: '/projects' },
    { icon: Clock, label: t('sidebar.history'), href: '/history' },
    { icon: Brain, label: t('sidebar.memory'), href: '/memory' },
    { icon: Settings, label: t('settings.title'), href: '/settings' },
  ];

  return (
    <aside
      dir={i18n.dir()}
      className={cn(
        'flex flex-col glass border-e border-border/30 transition-all duration-300',
        collapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-border/30 gap-2">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground whitespace-nowrap">
              {t('sidebar.workspace')}
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'ms-auto h-8 w-8 shrink-0',
            collapsed && 'hidden'
          )}
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Project Selector */}
      {!collapsed && (
        <div className="px-4 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              {t('sidebar.workspace')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setIsProjectDialogOpen(true)}
              title={t('projects.newProject')}
            >
              <Plus className="h-3 w-3" strokeWidth={1.5} />
            </Button>
          </div>
          {projects.length > 0 ? (
            <Select value={currentProject?.id} onValueChange={handleProjectSelect}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={t('projects.title')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span>{p.icon || '📁'}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              onClick={() => setIsProjectDialogOpen(true)}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
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
            <Briefcase className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </div>
      )}

      {/* New chat button */}
      <div className="p-4">
        <Button
          className={cn('w-full gap-2', collapsed ? 'px-0' : '')}
          onClick={() => navigate('/chat')}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          {!collapsed && <span>{t('chat.newChat')}</span>}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-6">
          {/* Project Context Tools */}
          {currentProject && !collapsed && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {currentProject.name}
              </div>
              {projectTools.map((item) => {
                const isActive = location.pathname.startsWith(item.href.split('?')[0]);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      i18n.dir() === 'rtl' && 'flex-row-reverse text-right'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {(!currentProject || collapsed) && (
            <div className="space-y-1">
              {projectTools.map((item) => {
                const isActive = location.pathname.startsWith(item.href.split('?')[0]);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      !collapsed && i18n.dir() === 'rtl' && 'flex-row-reverse text-right'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Global Tools */}
          <div className="space-y-1">
            {!collapsed && currentProject && (
              <div className="px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3 mt-6">
                {t('sidebar.workspace')}
              </div>
            )}
            {globalTools.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    !collapsed && i18n.dir() === 'rtl' && 'flex-row-reverse text-right'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Recent conversations */}
        {!collapsed && recentConversations.length > 0 && (
          <div className="mt-8">
            <p className="px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3">
              {t('sidebar.recent')}
            </p>
            <div className="space-y-1">
              {recentConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat?conversationId=${conv.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 truncate",
                    i18n.dir() === 'rtl' && 'flex-row-reverse text-right'
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.5} />
                  <span className="truncate">{conv.title || t('chat.untitled')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/30 space-y-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full gap-3',
            collapsed ? 'justify-center px-0' : 'justify-start',
            i18n.dir() === 'rtl' && !collapsed && 'flex-row-reverse'
          )}
          onClick={toggleTheme}
        >
          {isDark ? (
            <Moon className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Sun className="h-4 w-4" strokeWidth={1.5} />
          )}
          {!collapsed && (
            <span className="text-sm">
              {isDark ? t('common.darkMode') : t('common.lightMode')}
            </span>
          )}
        </Button>

        {/* Language Switcher */}
        {!collapsed && (
          <div
            className={cn(
              'px-3 flex items-center justify-between',
              i18n.dir() === 'rtl' && 'flex-row-reverse'
            )}
          >
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
                'w-full gap-3',
                collapsed ? 'justify-center px-0' : 'justify-start',
                i18n.dir() === 'rtl' && !collapsed && 'flex-row-reverse'
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="truncate text-sm">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-elevated">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4 me-2" strokeWidth={1.5} />
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
          className="mx-auto mb-3 h-8 w-8"
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4 rotate-180 rtl:rotate-0" strokeWidth={1.5} />
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
