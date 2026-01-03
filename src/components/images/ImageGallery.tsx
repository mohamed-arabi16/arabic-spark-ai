import { GeneratedImage } from '@/hooks/useImages';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ar } from 'date-fns/locale';

interface ImageGalleryProps {
  images: GeneratedImage[];
  onDelete: (id: string) => Promise<void>;
}

export function ImageGallery({ images, onDelete }: ImageGalleryProps) {
  const { t, i18n } = useTranslation();

  // Date formatting locale
  const dateLocale = i18n.language === 'ar' ? ar : enUS;

  if (images.length === 0) {
    return (
      <div className="text-center py-20 border rounded-lg border-dashed">
        <h3 className="text-lg font-medium">{t('images.noImages')}</h3>
        <p className="text-muted-foreground">
          {t('images.noImagesDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {images.map((image) => (
        <Card key={image.id} className="overflow-hidden group relative">
          <div className="aspect-square relative overflow-hidden bg-muted">
            <img
              src={image.image_url}
              alt={image.prompt}
              className="object-cover w-full h-full transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="icon" variant="secondary">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('images.generatedImage')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="w-full rounded-md"
                    />
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('images.prompt')}</h4>
                      <p className="text-sm">{image.prompt}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                       <span>{t('images.size')}: {image.size}</span>
                       <span>{t('images.model')}: {image.model_used}</span>
                       <span>{t('images.created')}: {new Date(image.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button size="icon" variant="secondary" onClick={() => window.open(image.image_url, '_blank')}>
                <Download className="h-4 w-4" />
              </Button>

              <Button size="icon" variant="destructive" onClick={() => onDelete(image.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardContent className="p-3">
            <p className="text-sm truncate font-medium">{image.prompt}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(image.created_at), { addSuffix: true, locale: dateLocale })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
