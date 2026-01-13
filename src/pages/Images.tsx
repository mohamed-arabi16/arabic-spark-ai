import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { ImageGenerationPanel } from '@/components/images/ImageGenerationPanel';
import { ImageGallery } from '@/components/images/ImageGallery';
import { ImageGenerationProgress } from '@/components/images/ImageGenerationProgress';
import { useImages } from '@/hooks/useImages';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

export default function Images() {
  const { t } = useTranslation();
  const { images, isLoading, isGenerating, fetchImages, generateImage, deleteImage } = useImages();

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDelete = async (id: string) => {
    if (confirm(t('common.confirmDelete'))) {
      await deleteImage(id);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <PageHeader
          title={t('images.title')}
          subtitle={t('images.subtitle')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ImageGenerationPanel onGenerate={generateImage} isGenerating={isGenerating} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <ImageGenerationProgress isGenerating={isGenerating} />

            {isLoading && images.length === 0 ? (
               <div className="flex items-center justify-center h-40">
                 <LoadingIndicator className="text-primary" />
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
