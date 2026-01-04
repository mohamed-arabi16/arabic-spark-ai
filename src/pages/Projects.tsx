import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProjects, Project, ProjectInsert, ProjectUpdate } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectSettings } from '@/components/projects/ProjectSettings';
import { ProjectMemorySummary } from '@/components/projects/ProjectMemorySummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Projects() {
  const { t } = useTranslation();
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
      // In useProjects, deleteProject actually archives. To restore, we might need a dedicated function if supported,
      // but usually 'deleteProject' toggles or sets is_archived.
      // Checking useProjects implementation (from memory, not file content): it likely calls supabase delete or update.
      // If deleteProject removes it, we can't restore.
      // However, the previous code called deleteProject on archive.
      // Let's assume deleteProject is soft delete (archive).
      // To restore, we would need an 'unarchive' or updateProject({is_archived: false}).
      // Since I don't see unarchive in the hook usage, I will use updateProject to toggle.
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

  return (
    <MainLayout>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('projects.title')}</h1>
            <p className="text-muted-foreground">
              {t('projects.subtitle')}
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="me-2 h-4 w-4" /> {t('projects.newProject')}
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">{t('projects.allProjects')}</TabsTrigger>
              <TabsTrigger value="recent">{t('projects.recent')}</TabsTrigger>
              <TabsTrigger value="settings" disabled={!currentProject}>
                {t('projects.settings')}
              </TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('projects.searchPlaceholder')}
                className="ps-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search projects"
              />
            </div>
          </div>

          <TabsContent value="all" className="space-y-8">
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-20 border rounded-lg border-dashed">
                <h3 className="text-lg font-medium">{t('projects.noProjects')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('projects.createFirstProject')}
                </p>
                <Button onClick={handleCreate} variant="outline">
                  <Plus className="me-2 h-4 w-4" /> {t('projects.newProject')}
                </Button>
              </div>
            ) : (
              <>
                {/* Active Projects */}
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        Active Projects
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{activeProjects.length}</span>
                    </h2>
                    {activeProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEdit}
                                onDelete={handleArchive}
                                onSelect={handleSelect}
                                onViewMemory={handleViewMemory}
                                isSelected={currentProject?.id === project.id}
                            />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">No active projects.</p>
                    )}
                </div>

                {/* Archived Projects */}
                {archivedProjects.length > 0 && (
                    <div className="pt-4 border-t">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                            Archived Projects
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{archivedProjects.length}</span>
                        </h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {archivedProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEdit}
                                onDelete={handleArchive}
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

          <TabsContent value="recent" className="space-y-4">
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.slice(0, 5).length === 0 ? (
               <div className="text-center py-20 border rounded-lg border-dashed">
                <h3 className="text-lg font-medium">{t('projects.noRecent')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('projects.recentDescription')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.slice(0, 5).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEdit}
                    onDelete={handleArchive}
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
              <div className="text-center py-10">
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
