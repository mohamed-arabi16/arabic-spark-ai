import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ar, enUS } from 'date-fns/locale';

interface ResearchItem {
  id: string;
  topic: string;
  date: Date;
  summary: string;
  conversationId: string;
}

export default function Research() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [topic, setTopic] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchHistory, setResearchHistory] = useState<ResearchItem[]>([]);
  const [currentResult, setCurrentResult] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load research history from database
  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Get research conversations
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select(`
            id,
            title,
            created_at,
            messages (
              content,
              role
            )
          `)
          .eq('user_id', user.id)
          .eq('mode', 'research')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        const history: ResearchItem[] = (conversations || []).map((conv: any) => {
          const assistantMessage = conv.messages?.find((m: any) => m.role === 'assistant');
          const userMessage = conv.messages?.find((m: any) => m.role === 'user');
          
          return {
            id: conv.id,
            topic: userMessage?.content || conv.title?.replace('Research: ', '') || t('research.untitled'),
            date: new Date(conv.created_at),
            summary: assistantMessage?.content || t('research.noResults'),
            conversationId: conv.id,
          };
        });

        setResearchHistory(history);
      } catch (error) {
        console.error('Failed to load research history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [user, t]);

  const handleResearch = async () => {
    if (!topic.trim()) return;

    setIsResearching(true);
    setCurrentResult('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: topic,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || t('research.errorStart'));
      }

      const conversationId = resp.headers.get('X-Conversation-Id');
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
                  setCurrentResult(accumulatedText);
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
              if (content) {
                accumulatedText += content;
                setCurrentResult(accumulatedText);
              }
            } catch { }
          }
        }
      }

      // Add to local history
      const newResearch: ResearchItem = {
        id: conversationId || crypto.randomUUID(),
        topic,
        date: new Date(),
        summary: accumulatedText || t('research.noResults'),
        conversationId: conversationId || '',
      };

      setResearchHistory(prev => [newResearch, ...prev]);
      setTopic('');
      setCurrentResult('');
      toast.success(t('research.successMessage'));

    } catch (error) {
      console.error('Research error:', error);
      toast.error(error instanceof Error ? error.message : t('research.errorConduct'));
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('research.title')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('research.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t('research.startSession')}
            </CardTitle>
            <CardDescription>
              {t('research.sessionDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('research.placeholder')}
                  className="ps-8"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isResearching}
                  onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                />
              </div>
              <Button onClick={handleResearch} disabled={isResearching || !topic.trim()}>
                {isResearching ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('research.searching')}
                  </>
                ) : (
                  t('research.searchButton')
                )}
              </Button>
            </div>

            {/* Live streaming result */}
            {currentResult && (
              <Card className="bg-muted/30 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('research.researchingTopic', { topic })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-start" dir="auto">
                      {currentResult}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Research History */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('research.recentResearch')}
          </h2>
          
          {isLoadingHistory ? (
            <Card className="bg-muted/50">
              <CardContent className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : researchHistory.length === 0 ? (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">{t('research.noHistory')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {researchHistory.map((item) => (
                <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{item.topic}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(item.date, { addSuffix: true, locale: i18n.language === 'ar' ? ar : enUS })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[150px]">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap text-start" dir="auto">
                        {item.summary.substring(0, 500)}
                        {item.summary.length > 500 && '...'}
                      </p>
                    </ScrollArea>
                    {item.conversationId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => window.location.href = `/history`}
                      >
                        <ExternalLink className="h-3 w-3 me-1" />
                        {t('research.viewInHistory')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
