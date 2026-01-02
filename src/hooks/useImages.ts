import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type GeneratedImage = Tables<'generated_images'>;

export function useImages() {
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
      toast.error('Failed to load images');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateImage = async (prompt: string, size: string) => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, size, user_id: user.id },
      });

      if (error) throw error;

      setImages(prev => [data, ...prev]);
      toast.success('Image generated!');
      return data;
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
      throw error;
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
      toast.success('Image deleted');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
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
