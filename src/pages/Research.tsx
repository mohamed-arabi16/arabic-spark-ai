import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResearchItem {
    id: string;
    topic: string;
    date: Date;
    summary: string;
}

export default function Research() {
  const [topic, setTopic] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchHistory, setResearchHistory] = useState<ResearchItem[]>([]);

  const handleResearch = async () => {
    if (!topic.trim()) return;

    setIsResearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Conduct comprehensive research on: ${topic}. Provide a summary.` }],
          mode: 'research',
        }),
      });

      if (!resp.ok) {
        throw new Error('Failed to start research');
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  accumulatedText += content;
                }
              } catch {
                // Ignore incomplete JSON
              }
            }
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
         const lines = textBuffer.split('\n');
         for (let line of lines) {
             if (line.endsWith('\r')) line = line.slice(0, -1);
             if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                 try {
                     const data = JSON.parse(line.slice(6));
                     const content = data.choices?.[0]?.delta?.content;
                     if (content) accumulatedText += content;
                 } catch { }
             }
         }
      }

      const newResearch: ResearchItem = {
        id: crypto.randomUUID(),
        topic,
        date: new Date(),
        summary: accumulatedText || 'Research completed (no summary returned).'
      };

      setResearchHistory(prev => [newResearch, ...prev]);
      setTopic('');
      toast.success('Research completed');

    } catch (error) {
      console.error('Research error:', error);
      toast.error('Failed to conduct research');
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Research</h1>
          <p className="text-muted-foreground text-lg">
            Explore topics and gather information with AI assistance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start a Research Session</CardTitle>
            <CardDescription>
              Enter a topic to begin comprehensive research.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Enter research topic..."
                  className="pl-8"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isResearching}
                  onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                />
              </div>
              <Button onClick={handleResearch} disabled={isResearching || !topic.trim()}>
                {isResearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Researching...
                  </>
                ) : (
                  'Start Research'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {researchHistory.length === 0 ? (
                <Card className="bg-muted/50 border-dashed col-span-full">
                  <CardContent className="flex items-center justify-center h-40">
                      <p className="text-muted-foreground">No recent research found.</p>
                  </CardContent>
                </Card>
             ) : (
                researchHistory.map((item) => (
                  <Card key={item.id} className="max-h-[300px] overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-lg">{item.topic}</CardTitle>
                      <CardDescription>{item.date.toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-6 whitespace-pre-wrap">
                        {item.summary}
                      </p>
                    </CardContent>
                  </Card>
                ))
             )}
        </div>
      </div>
    </MainLayout>
  );
}
