import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useModelSettings } from '@/hooks/useModelSettings';
import { cn } from '@/lib/utils';

interface ImageGenerationPanelProps {
  onGenerate: (prompt: string, size: string, negativePrompt?: string, style?: string, model?: string) => Promise<void>;
  isGenerating: boolean;
}

export function ImageGenerationPanel({ onGenerate, isGenerating }: ImageGenerationPanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { settings, availableModels, isLoading: isLoadingModels } = useModelSettings();
  
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [style, setStyle] = useState('none');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Get available image models
  const imageModels = availableModels?.imageModels?.filter(m => m.available) || [];

  // Set default model when settings load
  useEffect(() => {
    if (settings.default_image_model && !selectedModel) {
      setSelectedModel(settings.default_image_model);
    } else if (imageModels.length > 0 && !selectedModel) {
      setSelectedModel(imageModels[0].id);
    }
  }, [settings.default_image_model, imageModels, selectedModel]);

  const variations = [
    { id: 'dark', label: t('images.varDark'), promptSuffix: ' dark mode, low key lighting' },
    { id: 'bright', label: t('images.varBright'), promptSuffix: ' bright, high key lighting, sunny' },
    { id: 'cinematic', label: t('images.varCinematic'), promptSuffix: ' cinematic lighting, 8k, detailed' },
    { id: 'sketch', label: t('images.varSketch'), promptSuffix: ' pencil sketch, rough lines' },
  ];

  const handleVariationClick = (suffix: string) => {
    setPrompt((prev) => `${prev}${prev ? ', ' : ''}${suffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await onGenerate(prompt, size, negativePrompt, style, selectedModel);
  };

  return (
    <Card className="h-full flex flex-col" dir={i18n.dir()}>
      <CardHeader>
        <CardTitle>{t('images.generateNew')}</CardTitle>
        <CardDescription>
          {t('images.generateSubtitle')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <CardContent className="space-y-4 flex-1">
          {/* Model Selector */}
          <div className="space-y-2">
            <Label htmlFor="model">{t('images.model')}</Label>
            <Select 
              value={selectedModel} 
              onValueChange={setSelectedModel} 
              disabled={isGenerating || isLoadingModels}
            >
              <SelectTrigger className={cn(isRTL && "text-right")}>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {imageModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <span>{model.name}</span>
                      {model.tier === 'premium' && (
                        <Badge className="text-[10px] px-1 py-0 bg-gradient-to-r from-violet-500/90 to-purple-600/90 border-0">
                          Pro
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">{t('images.prompt')}</Label>
            <Textarea
              id="prompt"
              placeholder={t('images.placeholder')}
              className={cn("resize-none h-32", isRTL && "text-right")}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              dir="auto"
            />

            {/* Quick Variations */}
            <div className={cn("flex flex-wrap gap-2 pt-1", isRTL && "flex-row-reverse")}>
              {variations.map((v) => (
                <Badge
                  key={v.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary hover:text-secondary-foreground transition-colors"
                  onClick={() => handleVariationClick(v.promptSuffix)}
                >
                  <Wand2 className="h-3 w-3 me-1" />
                  {v.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
             <Label htmlFor="negative">{t('images.negativePrompt')}</Label>
             <Textarea
               id="negative"
               placeholder={t('images.negativePlaceholder')}
               className={cn("resize-none h-20 text-sm", isRTL && "text-right")}
               value={negativePrompt}
               onChange={(e) => setNegativePrompt(e.target.value)}
               disabled={isGenerating}
               dir="auto"
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">{t('images.size')}</Label>
              <Select value={size} onValueChange={setSize} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                  <SelectItem value="1536x1024">Landscape (1536x1024)</SelectItem>
                  <SelectItem value="1024x1536">Portrait (1024x1536)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="style">{t('images.style')}</Label>
              <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('images.styleNone')}</SelectItem>
                  <SelectItem value="photorealistic">{t('images.stylePhoto')}</SelectItem>
                  <SelectItem value="illustration">{t('images.styleIllustration')}</SelectItem>
                  <SelectItem value="anime">{t('images.styleAnime')}</SelectItem>
                  <SelectItem value="3d-render">{t('images.style3d')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button type="submit" className="w-full" disabled={!prompt.trim() || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('images.generating')}
              </>
            ) : (
              <>
                <Sparkles className="me-2 h-4 w-4" />
                {t('images.generate')}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
