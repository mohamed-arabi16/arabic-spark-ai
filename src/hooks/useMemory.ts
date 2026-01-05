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
  last_used_at?: string;
};

export type MemoryInsert = TablesInsert<'memory_objects'>;
export type MemoryUpdate = TablesUpdate<'memory_objects'>;

export type MemoryStatus = 'proposed' | 'approved' | 'rejected';

export function useMemory(projectId?: string) {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [proposedMemories, setProposedMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
        .order('confidence', { ascending: false });

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

  // Create audit log entry
  const createAuditEntry = async (
    memoryId: string | null, 
    action: string, 
    oldContent?: string, 
    newContent?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('memory_audit_log').insert({
        user_id: user.id,
        memory_id: memoryId,
        action,
        old_content: oldContent,
        new_content: newContent,
        metadata: metadata || {}
      } as any);
    } catch (error) {
      console.error('Failed to create audit entry:', error);
    }
  };

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
          status,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const memory = data as Memory;
      
      // Create audit entry
      await createAuditEntry(memory.id, 'created', undefined, content, { category, is_global: isGlobal });

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
      // Get old content for audit
      const oldMemory = memories.find(m => m.id === id) || proposedMemories.find(m => m.id === id);

      const { data, error } = await supabase
        .from('memory_objects')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const memory = data as Memory;
      
      // Create audit entry
      await createAuditEntry(
        id, 
        'updated', 
        oldMemory?.content, 
        updates.content || oldMemory?.content,
        { updates: Object.keys(updates) }
      );
      
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
      const memory = proposedMemories.find(m => m.id === id);
      await updateMemory(id, { status: 'approved' } as any);
      await createAuditEntry(id, 'approved', undefined, memory?.content);
      toast.success(t('messages.memoryApproved'));
    } catch (error) {
      // Error already handled
    }
  };

  const rejectMemory = async (id: string) => {
    try {
      const memory = proposedMemories.find(m => m.id === id);
      await updateMemory(id, { status: 'rejected', is_active: false } as any);
      await createAuditEntry(id, 'rejected', memory?.content, undefined);
      toast.success(t('messages.memoryRejected'));
    } catch (error) {
      // Error already handled
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      // Get the memory content first for audit
      const memory = memories.find(m => m.id === id) || proposedMemories.find(m => m.id === id);

      const { error } = await supabase
        .from('memory_objects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Create audit entry with old content
      await createAuditEntry(id, 'deleted', memory?.content, undefined, { 
        category: memory?.category,
        was_global: memory?.is_global 
      });

      setMemories(prev => prev.filter(m => m.id !== id));
      setProposedMemories(prev => prev.filter(m => m.id !== id));
      toast.success(t('messages.memoryDeleted'));
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error(t('errors.deleteMemory'));
      throw error;
    }
  };

  // Export user data
  const exportData = async (options?: { 
    include_memories?: boolean; 
    include_conversations?: boolean; 
    include_messages?: boolean;
  }) => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('export-data', {
        body: {
          include_memories: options?.include_memories ?? true,
          include_conversations: options?.include_conversations ?? true,
          include_messages: options?.include_messages ?? true,
        }
      });

      if (response.error) throw response.error;

      // Download the JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bayt-al-lisan-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('memory.exportSuccess'));
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error(t('errors.exportFailed'));
      throw error;
    } finally {
      setIsExporting(false);
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
    isExporting,
    fetchMemories,
    fetchApprovedMemories,
    addMemory,
    updateMemory,
    approveMemory,
    rejectMemory,
    deleteMemory,
    exportData,
    getMemoryContext,
  };
}
