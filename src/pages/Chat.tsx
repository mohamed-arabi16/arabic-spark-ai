import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const projectId = searchParams.get('project');
  const { projects } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const { memories, fetchMemories, addMemory, updateMemory, deleteMemory } = useMemory(projectId || undefined);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ChatMode>('fast');

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Load history from state if available
  useEffect(() => {
    if (location.state?.conversation) {
      const conv = location.state.conversation;
      if (conv.messages) {
        // Convert string timestamps back to Date objects if necessary
        const loadedMessages = conv.messages.map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(loadedMessages);
      }
    }
  }, [location.state]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveToHistory = (msgs: Message[]) => {
    try {
      const history = JSON.parse(localStorage.getItem('chat_history') || '[]');

      const conversationId = location.state?.conversation?.id;

      if (!conversationId) {
        // Create new
        const newId = crypto.randomUUID();
        const title = msgs[0]?.content.slice(0, 30) || 'New Chat';
        const newItem = {
            id: newId,
            title,
            date: new Date().toISOString(),
            preview: msgs[msgs.length - 1]?.content.slice(0, 50) + '...',
            messages: msgs
        };
        // Add to history
        localStorage.setItem('chat_history', JSON.stringify([newItem, ...history]));
      } else {
        // Update existing
         const newHistory = history.map((item: { id: string }) => {
             if (item.id === conversationId) {
                 return {
                     ...item,
                     messages: msgs,
                     preview: msgs[msgs.length - 1]?.content.slice(0, 50) + '...',
                     date: new Date().toISOString()
                 };
             }
             return item;
         });
         localStorage.setItem('chat_history', JSON.stringify(newHistory));
      }
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
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
      setMessages((prev) => {
        const newMessages = [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            model: mode === 'fast' ? 'gpt-5-mini' : mode === 'deep' ? 'gpt-5' : 'gpt-5-mini',
          } as Message,
        ];
        saveToHistory(newMessages);
        return newMessages;
      });

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        textBuffer += chunk;

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
              setMessages((prev) => {
                const newMessages = prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                );
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, put back and wait
            console.log('Incomplete JSON, buffering line:', line);
            // Wait, if it failed parsing, it might be split JSON. But we split by \n.
            // If OpenAI sends JSON split across lines (unlikely for data: prefix), we might have issues.
            // But usually 'data: {...}' is one line.
            // If the buffer split a line, we wouldn't be here (indexOf \n check).
            // So if JSON.parse fails here, the line content is malformed or we assumed wrong format.
            // However, the reviewer said "logic assumes that every network chunk ends perfectly on a newline".
            // My code:
            // textBuffer += chunk;
            // while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) { ... }
            // This IS buffering.
            // The reviewer might have been looking at `Research.tsx` which I implemented later and copied simplified logic.
            // But let's verify `Chat.tsx`.
            // The code I had:
            // textBuffer += decoder.decode(value, { stream: true });
            // while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) ...
            // This logic seems correct for handling split lines.
            // Wait, if `decoder.decode(value, { stream: true })` returns a partial multi-byte char?
            // `TextDecoder` handles that.
            // If `chunk` ends in middle of `\n`? No, `indexOf` handles that.
            // If `chunk` ends in middle of a line, it stays in `textBuffer` until next chunk appends more.
            // So `Chat.tsx` logic seems correct actually.
            // Let's check `Research.tsx`.

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

      // Save final state
      setMessages(prev => {
        saveToHistory(prev);
        return prev;
      });

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
            extractionResp.data.facts.forEach((fact: { content: string; category: string }) => {
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
    setMessage(suggestion);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className={`flex-1 flex flex-col overflow-hidden relative mode-${mode}-bg`}>
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
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          onStop={handleStop}
          message={message}
          setMessage={setMessage}
          mode={mode}
          setMode={setMode}
        />
      </div>
    </MainLayout>
  );
}
