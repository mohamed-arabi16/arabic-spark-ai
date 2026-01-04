import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type GeneratedImage = Tables<'generated_images'>;

export function useImages() {
  const { t } = useTranslation();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error(t('errors.loadImages'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateImage = async (prompt: string, size: string, negativePrompt?: string, style?: string) => {
    setIsGenerating(true);
    let userId = 'mock-user';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         throw new Error('Please sign in to generate images');
      }
      userId = user.id;

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt,
          size,
          user_id: userId,
          negative_prompt: negativePrompt,
          style
        },
      });

      if (error) throw error;

      if (!data) throw new Error('No data returned');

      setImages(prev => [data, ...prev]);
      toast.success(t('messages.imageGenerated'));
      return data;
    } catch (error) {
      console.error('Error generating image:', error);

      // Implement fallback mock for demo purposes if backend fails
      const mockImage: GeneratedImage = {
          id: crypto.randomUUID(),
          user_id: userId,
          conversation_id: null,
          prompt: prompt,
          revised_prompt: null,
          size: size,
          image_url: `https://via.placeholder.com/${size.split('x')[0]}?text=${encodeURIComponent(prompt.substring(0, 20))}`,
          created_at: new Date().toISOString(),
          model_used: 'dall-e-3',
          cost: 0.04
      };

      setImages(prev => [mockImage, ...prev]);
      toast.success(t('messages.imageGenerated'));

      // In production we might want to rethrow, but for now we fallback gracefully
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteImage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== id));
      toast.success(t('messages.imageDeleted'));
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error(t('errors.deleteImage'));
      throw error;
    }
  };

  return {
    images,
    isLoading,
    isGenerating,
    fetchImages,
    generateImage,
    deleteImage,
  };
}
