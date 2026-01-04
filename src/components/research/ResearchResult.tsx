import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslation } from 'react-i18next';
import { Copy, ChevronDown, ChevronUp, FileText, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { toast } from 'sonner';

interface ResearchResultProps {
  content: string;
  topic: string;
}

export function ResearchResult({ content, topic }: ResearchResultProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  // Split content into summary and details
  // Heuristics:
  // 1. If "Sources:" or "---\n**Sources:**" exists, split it.
  // 2. If there is a "Summary" header, use that.

  // Basic parsing
  const sourcesIndex = content.search(/(\*\*Sources:\*\*|Sources:|References:)/i);
  let mainContent = content;
  let sourcesContent = '';

  if (sourcesIndex !== -1) {
    mainContent = content.substring(0, sourcesIndex);
    sourcesContent = content.substring(sourcesIndex);
  }

  // Parse structured sources if possible (Perplexity format usually)
  // For now we just render markdown of sources

  // Try to find a "TL;DR" or summary section
  const summaryMatch = mainContent.match(/(\*\*TL;DR\*\*|Summary:|Overview)([\s\S]*?)(#|\*\*Detailed|\n\n)/i);
  const summaryText = summaryMatch ? summaryMatch[2] : mainContent.substring(0, 500) + '...';
  const detailedText = summaryMatch ? mainContent.replace(summaryMatch[0], '') : mainContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('research.resultFor', { topic })}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
           <div className="prose prose-sm dark:prose-invert max-w-none text-start" dir="auto">
             <h4 className="font-semibold mb-2">{t('research.summary')}</h4>
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
               {summaryText}
             </ReactMarkdown>
           </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
                {t('research.detailedReport')}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
               <div className="prose prose-sm dark:prose-invert max-w-none text-start" dir="auto">
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>
                   {detailedText}
                 </ReactMarkdown>
               </div>
            </CollapsibleContent>
          </Collapsible>
        </CardFooter>
      </Card>

      {sourcesContent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('research.sources')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none text-start text-xs text-muted-foreground" dir="auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sourcesContent}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
