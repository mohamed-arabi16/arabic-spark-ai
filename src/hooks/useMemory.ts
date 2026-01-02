import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Memory = Tables<'memory_objects'>;
export type MemoryInsert = TablesInsert<'memory_objects'>;
export type MemoryUpdate = TablesUpdate<'memory_objects'>;

export function useMemory(projectId?: string) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('memory_objects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
      // toast.error('Failed to load memories'); // Silently fail to not annoy user
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const addMemory = async (content: string, category = 'fact', isGlobal = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('memory_objects')
        .insert({
          user_id: user.id,
          project_id: isGlobal ? null : projectId,
          content,
          category,
          is_global: isGlobal,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setMemories(prev => [data, ...prev]);
      toast.success('Memory saved');
      return data;
    } catch (error) {
      console.error('Error adding memory:', error);
      toast.error('Failed to save memory');
      throw error;
    }
  };

  const updateMemory = async (id: string, updates: MemoryUpdate) => {
    try {
      const { data, error } = await supabase
        .from('memory_objects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setMemories(prev => prev.map(m => m.id === id ? data : m));
      return data;
    } catch (error) {
      console.error('Error updating memory:', error);
      toast.error('Failed to update memory');
      throw error;
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('memory_objects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMemories(prev => prev.filter(m => m.id !== id));
      toast.success('Memory deleted');
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error('Failed to delete memory');
      throw error;
    }
  };

  return {
    memories,
    isLoading,
    fetchMemories,
    addMemory,
    updateMemory,
    deleteMemory,
  };
}
