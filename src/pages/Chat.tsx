import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage, Message } from '@/components/chat/ChatMessage';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatMode } from '@/components/chat/ModeSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useMemory } from '@/hooks/useMemory';
import { MemoryBadge } from '@/components/memory/MemoryBadge';
import { MemoryManager } from '@/components/memory/MemoryManager';
import { showMemorySuggestion } from '@/components/memory/MemorySuggestion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { CostMeter } from '@/components/chat/CostMeter';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const { projects } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const { memories, fetchMemories, addMemory, updateMemory, deleteMemory } = useMemory(projectId || undefined);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string, mode: ChatMode) => {
    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Build messages for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Include memories in context
      const memoryContext = memories
        .map(m => `${m.category}: ${m.content}`)
        .join('\n');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          mode,
          project_id: projectId,
          system_instructions: project?.system_instructions,
          memory_context: memoryContext
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Failed to get response');
      }

      if (!resp.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      // Create assistant message placeholder
      const assistantMessageId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          model: mode === 'fast' ? 'gpt-5-mini' : mode === 'deep' ? 'gpt-5' : 'gpt-5-mini',
        },
      ]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            // Incomplete JSON, put back and wait
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            /* ignore */
          }
        }
      }

      // Check for memory extraction
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const extractionResp = await supabase.functions.invoke('extract-memory', {
            body: {
              messages: apiMessages,
              project_id: projectId,
              user_id: user.id
            }
          });

          if (extractionResp.data && extractionResp.data.facts && extractionResp.data.facts.length > 0) {
            extractionResp.data.facts.forEach((fact: any) => {
              showMemorySuggestion(fact, () => {
                addMemory(fact.content, fact.category, false);
              });
            });
          }
        }
      } catch (err) {
        console.error('Memory extraction failed', err);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled
        return;
      }
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      // Remove the empty assistant message if error
      setMessages((prev) => prev.filter((m) => m.content !== ''));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion, 'standard');
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header extras */}
        <div className="absolute top-2 right-4 z-10 flex items-center gap-4">
           <CostMeter sessionCost={sessionCost} />
           <Sheet open={isMemoryOpen} onOpenChange={setIsMemoryOpen}>
              <SheetTrigger asChild>
                <div onClick={() => setIsMemoryOpen(true)}>
                  <MemoryBadge count={memories.length} />
                </div>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <MemoryManager
                  memories={memories}
                  onAdd={addMemory}
                  onUpdate={updateMemory}
                  onDelete={deleteMemory}
                  projectId={projectId || undefined}
                />
              </SheetContent>
           </Sheet>
        </div>

        {/* Messages area */}
        <ScrollArea ref={scrollRef} className="flex-1">
          {messages.length === 0 ? (
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="max-w-4xl mx-auto pb-4 pt-8">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={
                    isLoading &&
                    index === messages.length - 1 &&
                    message.role === 'assistant'
                  }
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <ChatInput onSend={handleSend} isLoading={isLoading} onStop={handleStop} />
      </div>
    </MainLayout>
  );
}
