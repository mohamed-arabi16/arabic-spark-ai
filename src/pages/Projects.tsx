import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProjects, Project, ProjectInsert, ProjectUpdate } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectSettings } from '@/components/projects/ProjectSettings';
import { ProjectMemorySummary } from '@/components/projects/ProjectMemorySummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, FolderPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/common/EmptyState';
import { staggerContainer, staggerItem, prefersReducedMotion } from '@/lib/motion';

export default function Projects() {
  const { t } = useTranslation();
  const reducedMotion = prefersReducedMotion();
  const {
    projects,
    currentProject,
    isLoading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
  } = useProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [memoryProject, setMemoryProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeProjects = filteredProjects.filter(p => !p.is_archived);
  const archivedProjects = filteredProjects.filter(p => p.is_archived);

  const handleCreate = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleArchive = async (project: Project) => {
    if (confirm(`Are you sure you want to ${project.is_archived ? 'restore' : 'archive'} "${project.name}"?`)) {
      await updateProject(project.id, { is_archived: !project.is_archived });
    }
  };

  const handleSelect = (project: Project) => {
    selectProject(project.id);
  };

  const handleViewMemory = (project: Project) => {
    setMemoryProject(project);
    setIsMemoryDialogOpen(true);
  };

  const handleHardDelete = async (project: Project) => {
    if (confirm(`Are you sure you want to PERMANENTLY delete "${project.name}"? This cannot be undone.`)) {
        await deleteProject(project.id);
    }
  };

  const handleSubmit = async (data: ProjectInsert | ProjectUpdate) => {
    if (editingProject) {
      await updateProject(editingProject.id, data as ProjectUpdate);
    } else {
      await createProject(data as ProjectInsert);
    }
  };

  const MotionWrapper = reducedMotion ? 'div' : motion.div;

  return (
    <MainLayout>
      <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('projects.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('projects.subtitle')}
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" /> {t('projects.newProject')}
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="all">{t('projects.allProjects')}</TabsTrigger>
              <TabsTrigger value="recent">{t('projects.recent')}</TabsTrigger>
              <TabsTrigger value="settings" disabled={!currentProject}>
                {t('projects.settings')}
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('projects.searchPlaceholder')}
                className="ps-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search projects"
              />
            </div>
          </div>

          <TabsContent value="all" className="space-y-10">
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <EmptyState
                icon={FolderPlus}
                title={t('projects.noProjects')}
                description={t('projects.createFirstProject')}
                actionLabel={t('projects.newProject')}
                onAction={handleCreate}
              />
            ) : (
              <>
                {/* Active Projects */}
                <div>
                  <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                    Active Projects
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                      {activeProjects.length}
                    </span>
                  </h2>
                  {activeProjects.length > 0 ? (
                    <MotionWrapper
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      {...(reducedMotion ? {} : { variants: staggerContainer, initial: "hidden", animate: "visible" })}
                    >
                      {activeProjects.map((project) => (
                        <MotionWrapper
                          key={project.id}
                          {...(reducedMotion ? {} : { variants: staggerItem })}
                        >
                          <ProjectCard
                            project={project}
                            onEdit={handleEdit}
                            onArchive={handleArchive}
                            onDelete={handleHardDelete}
                            onUpdate={fetchProjects}
                            onSelect={handleSelect}
                            onViewMemory={handleViewMemory}
                            isSelected={currentProject?.id === project.id}
                          />
                        </MotionWrapper>
                      ))}
                    </MotionWrapper>
                  ) : (
                    <p className="text-muted-foreground text-sm">No active projects.</p>
                  )}
                </div>

                {/* Archived Projects */}
                {archivedProjects.length > 0 && (
                  <div className="pt-6 border-t border-border/50">
                    <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-muted-foreground">
                      Archived Projects
                      <span className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">
                        {archivedProjects.length}
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {archivedProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onEdit={handleEdit}
                          onArchive={handleArchive}
                          onDelete={handleHardDelete}
                          onUpdate={fetchProjects}
                          onSelect={handleSelect}
                          onViewMemory={handleViewMemory}
                          isSelected={currentProject?.id === project.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.slice(0, 5).length === 0 ? (
              <EmptyState
                icon={FolderPlus}
                title={t('projects.noRecent')}
                description={t('projects.recentDescription')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.slice(0, 5).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                    onDelete={handleHardDelete}
                    onUpdate={fetchProjects}
                    onSelect={handleSelect}
                    onViewMemory={handleViewMemory}
                    isSelected={currentProject?.id === project.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            {currentProject ? (
              <ProjectSettings
                project={currentProject}
                onArchive={() => handleArchive(currentProject)}
                onDelete={() => handleHardDelete(currentProject)}
              />
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {t('projects.selectToViewSettings')}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ProjectDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          project={editingProject}
          onSubmit={handleSubmit}
        />

        <Dialog open={isMemoryDialogOpen} onOpenChange={setIsMemoryDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Memory Summary: {memoryProject?.name}</DialogTitle>
            </DialogHeader>
            {memoryProject && <ProjectMemorySummary projectId={memoryProject.id} />}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
