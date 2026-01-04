import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';

interface ImageGenerationPanelProps {
  onGenerate: (prompt: string, size: string, negativePrompt?: string, style?: string) => Promise<void>;
  isGenerating: boolean;
}

export function ImageGenerationPanel({ onGenerate, isGenerating }: ImageGenerationPanelProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [style, setStyle] = useState('none');

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
    await onGenerate(prompt, size, negativePrompt, style);
    // Optional: Don't clear prompt so user can iterate?
    // User often wants to tweak. Let's keep it but maybe show a success toast handled by parent.
    // For now, let's keep the previous behavior of clearing, or change it?
    // "Prompting interface is minimal; variations and history aren’t prominent".
    // Usually iterating means keeping the prompt.
    // I will NOT clear the prompt to allow easy iteration.
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{t('images.generateNew')}</CardTitle>
        <CardDescription>
          {t('images.generateSubtitle')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <CardContent className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label htmlFor="prompt">{t('images.prompt')}</Label>
            <Textarea
              id="prompt"
              placeholder={t('images.placeholder')}
              className="resize-none h-32"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />

            {/* Quick Variations */}
            <div className="flex flex-wrap gap-2 pt-1">
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
               className="resize-none h-20 text-sm"
               value={negativePrompt}
               onChange={(e) => setNegativePrompt(e.target.value)}
               disabled={isGenerating}
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
