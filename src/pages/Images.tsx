import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ImageGenerationPanel } from '@/components/images/ImageGenerationPanel';
import { ImageGallery } from '@/components/images/ImageGallery';
import { useImages } from '@/hooks/useImages';
import { Loader2 } from 'lucide-react';

export default function Images() {
  const { images, isLoading, isGenerating, fetchImages, generateImage, deleteImage } = useImages();

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      await deleteImage(id);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Image Studio</h1>
          <p className="text-muted-foreground">
            Generate and manage your AI-created artwork.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ImageGenerationPanel onGenerate={generateImage} isGenerating={isGenerating} />
          </div>

          <div className="lg:col-span-2">
            {isLoading && images.length === 0 ? (
               <div className="flex items-center justify-center h-40">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            ) : (
              <ImageGallery images={images} onDelete={handleDelete} />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
