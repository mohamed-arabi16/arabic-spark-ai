import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type Memory = Tables<'memory_objects'> & {
  type?: string;
  key?: string;
  confidence?: number;
  status?: string;
  source_conversation_id?: string;
  source_message_ids?: string[];
};

export type MemoryInsert = TablesInsert<'memory_objects'>;
export type MemoryUpdate = TablesUpdate<'memory_objects'>;

export type MemoryStatus = 'proposed' | 'approved' | 'rejected';

export function useMemory(projectId?: string) {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [proposedMemories, setProposedMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemories = useCallback(async (status?: MemoryStatus) => {
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

      const allMemories = (data || []) as Memory[];
      
      // Separate by status
      const approved = allMemories.filter(m => 
        (m as any).status === 'approved' || !(m as any).status
      );
      const proposed = allMemories.filter(m => (m as any).status === 'proposed');
      
      setMemories(approved);
      setProposedMemories(proposed);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchApprovedMemories = useCallback(async (): Promise<Memory[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('memory_objects')
        .select('*')
        .eq('is_active', true)
        .or('status.eq.approved,status.is.null')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Memory[];
    } catch (error) {
      console.error('Error fetching approved memories:', error);
      return [];
    }
  }, [projectId]);

  const addMemory = async (
    content: string, 
    category = 'fact', 
    isGlobal = false,
    status: MemoryStatus = 'approved'
  ) => {
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
          is_active: true,
          // Note: status is handled by DB default and RLS
        } as any)
        .select()
        .single();

      if (error) throw error;

      const memory = data as Memory;
      if (status === 'approved' || !status) {
        setMemories(prev => [memory, ...prev]);
      } else {
        setProposedMemories(prev => [memory, ...prev]);
      }
      toast.success(t('messages.memorySaved'));
      return memory;
    } catch (error) {
      console.error('Error adding memory:', error);
      toast.error(t('errors.saveMemory'));
      throw error;
    }
  };

  const updateMemory = async (id: string, updates: Partial<Memory>) => {
    try {
      const { data, error } = await supabase
        .from('memory_objects')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const memory = data as Memory;
      
      // Update the correct list based on status
      if ((updates as any).status === 'approved') {
        setProposedMemories(prev => prev.filter(m => m.id !== id));
        setMemories(prev => [memory, ...prev]);
      } else if ((updates as any).status === 'rejected') {
        setProposedMemories(prev => prev.filter(m => m.id !== id));
      } else {
        setMemories(prev => prev.map(m => m.id === id ? memory : m));
        setProposedMemories(prev => prev.map(m => m.id === id ? memory : m));
      }
      
      return memory;
    } catch (error) {
      console.error('Error updating memory:', error);
      toast.error(t('errors.updateMemory'));
      throw error;
    }
  };

  const approveMemory = async (id: string) => {
    try {
      await updateMemory(id, { status: 'approved' } as any);
      toast.success(t('messages.memoryApproved'));
    } catch (error) {
      // Error already handled
    }
  };

  const rejectMemory = async (id: string) => {
    try {
      await updateMemory(id, { status: 'rejected', is_active: false } as any);
      toast.success(t('messages.memoryRejected'));
    } catch (error) {
      // Error already handled
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
      setProposedMemories(prev => prev.filter(m => m.id !== id));
      toast.success(t('messages.memoryDeleted'));
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error(t('errors.deleteMemory'));
      throw error;
    }
  };

  // Get memory context for chat (only approved memories)
  const getMemoryContext = useCallback(async (): Promise<string> => {
    const approved = await fetchApprovedMemories();
    if (approved.length === 0) return '';

    // Group by category
    const grouped = approved.reduce((acc, m) => {
      const cat = m.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m.content);
      return acc;
    }, {} as Record<string, string[]>);

    // Format for injection
    return Object.entries(grouped)
      .map(([cat, items]) => `${cat.toUpperCase()}:\n${items.map(i => `- ${i}`).join('\n')}`)
      .join('\n\n');
  }, [fetchApprovedMemories]);

  return {
    memories,
    proposedMemories,
    isLoading,
    fetchMemories,
    fetchApprovedMemories,
    addMemory,
    updateMemory,
    approveMemory,
    rejectMemory,
    deleteMemory,
    getMemoryContext,
  };
}
