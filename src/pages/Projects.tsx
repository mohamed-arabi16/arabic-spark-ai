import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProjects, Project, ProjectInsert, ProjectUpdate } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectSettings } from '@/components/projects/ProjectSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Projects() {
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
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreate = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleDelete = async (project: Project) => {
    if (confirm(`Are you sure you want to archive "${project.name}"?`)) {
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
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your workspaces and conversations.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">All Projects</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="settings" disabled={!currentProject}>
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search projects"
              />
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-20 border rounded-lg border-dashed">
                <h3 className="text-lg font-medium">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating a new project.
                </p>
                <Button onClick={handleCreate} variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Create Project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSelect={selectProject}
                    isSelected={currentProject?.id === project.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            <div className="text-sm text-muted-foreground">
              Recently accessed projects will appear here.
            </div>
          </TabsContent>

          <TabsContent value="settings">
            {currentProject ? (
              <ProjectSettings project={currentProject} />
            ) : (
              <div className="text-center py-10">
                Please select a project to view its settings.
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
      </div>
    </MainLayout>
  );
}
