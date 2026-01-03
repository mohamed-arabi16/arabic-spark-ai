import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type ConversationInsert = TablesInsert<'conversations'>;

export interface ConversationWithSnippet extends Conversation {
  snippet?: string;
  message_count?: number;
}

export function useConversations() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationWithSnippet[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const fetchConversations = useCallback(async (options?: {
    projectId?: string;
    archived?: boolean;
    limit?: number;
    searchQuery?: string;
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (options?.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options?.archived !== undefined) {
        query = query.eq('is_archived', options.archived);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.searchQuery) {
        query = query.ilike('title', `%${options.searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch last message snippet for each conversation
      const conversationsWithSnippets: ConversationWithSnippet[] = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          return {
            ...conv,
            snippet: lastMessage?.content?.substring(0, 100) || '',
            message_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithSnippets);
      return conversationsWithSnippets;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error(t('errors.loadConversations'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = async (projectId?: string, title?: string, mode?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          title: title || 'New Conversation',
          mode: (mode as any) || 'fast',
        } as any)
        .select()
        .single();

      if (error) throw error;

      setCurrentConversation(data);
      setMessages([]);
      setConversations(prev => [{ ...data, snippet: '', message_count: 0 }, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error(t('errors.createConversation'));
      throw error;
    }
  };

  const loadConversation = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      // Fetch conversation
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      setCurrentConversation(conv);

      // Fetch messages
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;

      setMessages(msgs || []);
      return { conversation: conv, messages: msgs || [] };
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error(t('errors.loadConversation'));
      throw error;
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const updateConversation = async (id: string, updates: Partial<Conversation>) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      if (currentConversation?.id === id) {
        setCurrentConversation(data);
      }
      return data;
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error(t('errors.updateConversation'));
      throw error;
    }
  };

  const archiveConversation = async (id: string) => {
    try {
      await updateConversation(id, { is_archived: true });
      setConversations(prev => prev.filter(c => c.id !== id));
      toast.success(t('messages.conversationArchived'));
    } catch (error) {
      // Error already handled in updateConversation
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
      toast.success(t('messages.conversationDeleted'));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error(t('errors.deleteConversation'));
      throw error;
    }
  };

  const addMessage = async (
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: {
      model_used?: string;
      input_tokens?: number;
      output_tokens?: number;
      cost?: number;
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          model_used: metadata?.model_used,
          input_tokens: metadata?.input_tokens,
          output_tokens: metadata?.output_tokens,
          cost: metadata?.cost,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  };

  const clearCurrentConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isLoadingMessages,
    fetchConversations,
    createConversation,
    loadConversation,
    updateConversation,
    archiveConversation,
    deleteConversation,
    addMessage,
    clearCurrentConversation,
    setMessages,
  };
}
