import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type ProjectUpdate = TablesUpdate<'projects'>;

export function useProjects() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);

      // Select the first project if none is selected
      if (!currentProject && data && data.length > 0) {
        // You might want to persist the selection in local storage or DB preference
        setCurrentProject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error(t('errors.loadProjects'));
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  const createProject = async (project: Omit<ProjectInsert, 'user_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({ ...project, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [data, ...prev]);
      setCurrentProject(data);
      toast.success(t('messages.projectCreated'));
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(t('errors.createProject'));
      throw error;
    }
  };

  const updateProject = async (id: string, updates: ProjectUpdate) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => prev.map(p => p.id === id ? data : p));
      if (currentProject?.id === id) {
        setCurrentProject(data);
      }
      toast.success(t('messages.projectUpdated'));
      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(t('errors.updateProject'));
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      // Soft delete
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(projects.find(p => p.id !== id) || null);
      }
      toast.success(t('messages.projectArchived'));
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(t('errors.archiveProject'));
      throw error;
    }
  };

  const selectProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProject(project);
    }
  };

  return {
    projects,
    currentProject,
    isLoading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
  };
}
