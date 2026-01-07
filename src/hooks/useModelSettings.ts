import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ModelInfo {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  tier: string;
  provider: string;
  available: boolean;
  capabilities?: string[];
}

interface ModelsResponse {
  chatModels: ModelInfo[];
  imageModels: ModelInfo[];
  researchModels: ModelInfo[];
  videoModels: ModelInfo[];
  providers: {
    openai: boolean;
    google: boolean;
    anthropic: boolean;
    thaura: boolean;
  };
  defaults: Record<string, string>;
}

interface UserModelSettings {
  id?: string;
  user_id?: string;
  default_chat_model: string;
  default_deep_think_model: string;
  default_research_model: string;
  default_image_model: string;
  default_video_model: string;
  enabled_models: string[];
  visible_chat_models: string[];
}

const DEFAULT_SETTINGS: UserModelSettings = {
  default_chat_model: 'openai/gpt-5.2',
  default_deep_think_model: 'google/gemini-3-pro',
  default_research_model: 'google/gemini-3-pro',
  default_image_model: 'google/nanobanana-pro',
  default_video_model: 'google/veo-2.1',
  enabled_models: [
    'openai/gpt-5.2', 'openai/gpt-5-nano', 'openai/gpt-image-1.5',
    'google/gemini-flash-3', 'google/gemini-3-pro', 'google/nanobanana-pro',
    'anthropic/sonnet-4.5', 'anthropic/haiku-4.5',
    'thaura/thaura'
  ],
  visible_chat_models: [
    'openai/gpt-5.2', 'google/gemini-3-pro', 'anthropic/sonnet-4.5'
  ],
};

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`;

export function useModelSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserModelSettings>(DEFAULT_SETTINGS);
  const [availableModels, setAvailableModels] = useState<ModelsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available models from backend
  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch(`${AI_GATEWAY_URL}?action=models`);
      if (response.ok) {
        const data: ModelsResponse = await response.json();
        setAvailableModels(data);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  }, []);

  // Fetch user settings from database
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_model_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch settings:', error);
      }

      if (data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchModels();
    fetchSettings();
  }, [fetchModels, fetchSettings]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const channel = supabase
      .channel(`user-model-settings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_model_settings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSettings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSettings]);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: Partial<UserModelSettings>) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('user_model_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setSettings(updatedSettings);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [user, settings]);

  // Update a single default model
  const setDefaultModel = useCallback((functionType: keyof Pick<UserModelSettings, 'default_chat_model' | 'default_deep_think_model' | 'default_research_model' | 'default_image_model' | 'default_video_model'>, modelId: string) => {
    saveSettings({ [functionType]: modelId });
  }, [saveSettings]);

  // Toggle model enabled status
  const toggleModelEnabled = useCallback((modelId: string) => {
    const newEnabled = settings.enabled_models.includes(modelId)
      ? settings.enabled_models.filter(m => m !== modelId)
      : [...settings.enabled_models, modelId];
    
    // Also remove from visible if disabled
    const newVisible = newEnabled.includes(modelId) 
      ? settings.visible_chat_models 
      : settings.visible_chat_models.filter(m => m !== modelId);
    
    saveSettings({ enabled_models: newEnabled, visible_chat_models: newVisible });
  }, [settings, saveSettings]);

  // Toggle model visibility in chat picker
  const toggleModelVisible = useCallback((modelId: string) => {
    if (!settings.enabled_models.includes(modelId)) {
      toast.error('Enable the model first');
      return;
    }
    
    const isVisible = settings.visible_chat_models.includes(modelId);
    
    if (!isVisible && settings.visible_chat_models.length >= 5) {
      toast.error('Maximum 5 models can be visible in chat');
      return;
    }
    
    const newVisible = isVisible
      ? settings.visible_chat_models.filter(m => m !== modelId)
      : [...settings.visible_chat_models, modelId];
    
    saveSettings({ visible_chat_models: newVisible });
  }, [settings, saveSettings]);

  // Get visible chat models with full info
  const getVisibleChatModels = useCallback(() => {
    if (!availableModels) return [];
    
    return availableModels.chatModels.filter(
      m => settings.visible_chat_models.includes(m.id) && m.available
    );
  }, [availableModels, settings.visible_chat_models]);

  return {
    settings,
    availableModels,
    isLoading,
    isSaving,
    saveSettings,
    setDefaultModel,
    toggleModelEnabled,
    toggleModelVisible,
    getVisibleChatModels,
    refetch: () => {
      fetchModels();
      fetchSettings();
    },
  };
}
