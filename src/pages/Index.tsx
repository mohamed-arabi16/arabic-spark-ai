import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, FolderOpen, ArrowRight, Clock, Star } from 'lucide-react';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectInsert } from '@/hooks/useProjects';
import { getFirstName } from '@/lib/nameFormatter';
import { formatDate, LTR } from '@/lib/bidi';

const Index = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projects, fetchProjects, createProject, isLoading } = useProjects();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Get recent projects (top 3 by updated_at)
  const recentProjects = projects.slice(0, 3);

  const handleProjectCreate = async (data: ProjectInsert) => {
    await createProject(data);
    setIsProjectDialogOpen(false);
  };
  // Format display name properly (fixes casing like "MOhamed" → "Mohamed")
  const displayName = getFirstName(user?.user_metadata?.full_name) || 'there';

  return (
    <MainLayout>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('dashboard.greeting', { name: displayName })}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('dashboard.subgreeting')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate('/chat')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('chat.newChat')}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+</div>
              <p className="text-xs text-muted-foreground">{t('chat.startNewConversation')}</p>
            </CardContent>
          </Card>

          <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setIsProjectDialogOpen(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('projects.newProject')}</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+</div>
              <p className="text-xs text-muted-foreground">{t('projects.createWorkspace')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">{t('dashboard.recentProjects')}</h2>
            <Button variant="ghost" className="gap-2" onClick={() => navigate('/projects')}>
              {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>

          {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                ))}
             </div>
          ) : recentProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentProjects.map((project) => (
                <Card key={project.id} className="group hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{project.icon || '💬'}</span>
                      <span className="truncate">{project.name}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {project.description || t('dashboard.noDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <LTR>{formatDate(project.updated_at, i18n.language)}</LTR>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigate(`/chat?project=${project.id}`)}
                    >
                      {t('common.open')}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">{t('projects.noProjects')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('projects.createFirstProject')}
                </p>
                <Button onClick={() => setIsProjectDialogOpen(true)}>
                  {t('projects.newProject')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        onSubmit={handleProjectCreate}
      />
    </MainLayout>
  );
};

export default Index;
