import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';

interface ImageGenerationPanelProps {
  onGenerate: (prompt: string, size: string) => Promise<void>;
  isGenerating: boolean;
}

export function ImageGenerationPanel({ onGenerate, isGenerating }: ImageGenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await onGenerate(prompt, size);
    setPrompt('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate New Image</CardTitle>
        <CardDescription>
          Describe the image you want to create using AI.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="A futuristic city in the desert, golden hour, digital art style..."
              className="resize-none h-24"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">Size</Label>
            <Select value={size} onValueChange={setSize} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                <SelectItem value="1536x1024">Landscape (1536x1024)</SelectItem>
                <SelectItem value="1024x1536">Portrait (1024x1536)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={!prompt.trim() || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
