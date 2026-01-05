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
import { useConversations } from '@/hooks/useConversations';
import { MemoryBadge } from '@/components/memory/MemoryBadge';
import { MemoryManager } from '@/components/memory/MemoryManager';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { CostMeter } from '@/components/chat/CostMeter';
import { useTranslation } from 'react-i18next';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { showMemorySuggestion } from '@/components/memory/MemorySuggestion';
import { fetchWithRetry } from '@/lib/api-utils';
import { useModelSettings } from '@/hooks/useModelSettings';

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`;

export default function Chat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  const projectIdParam = searchParams.get('project');
  
  const { projects, currentProject } = useProjects();
  const projectId = projectIdParam || currentProject?.id;
  const project = projects.find(p => p.id === projectId);
  
  const {
    currentConversation,
    messages: dbMessages,
    isLoadingMessages,
    loadConversation,
    createConversation,
    addMessage,
    setMessages: setDbMessages,
    clearCurrentConversation,
  } = useConversations();

  const { 
    memories, 
    proposedMemories,
    fetchMemories, 
    addMemory, 
    updateMemory, 
    deleteMemory,
    approveMemory,
    rejectMemory,
    getMemoryContext,
  } = useMemory(projectId || undefined);
  
  // Local messages state for UI (includes streaming content)
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ChatMode>('fast');
  const [dialect, setDialect] = useState('msa');
  const [isError, setIsError] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | undefined>(undefined);
  
  // Model settings from user preferences
  const { settings: modelSettings, getVisibleChatModels, availableModels } = useModelSettings();
  const visibleModels = getVisibleChatModels();

  // Show memory suggestions as minimal toasts when new proposed memories arrive
  useEffect(() => {
    if (proposedMemories.length > 0) {
      const newest = proposedMemories[0];
      if (newest) {
        showMemorySuggestion(
          { id: newest.id, content: newest.content, category: newest.category || 'general' },
          () => approveMemory(newest.id),
          newest.id
        );
      }
    }
  }, [proposedMemories, approveMemory]);

  useEffect(() => {
    // Initialize dialect from project or localStorage
    const savedDialect = project?.dialect_preset || localStorage.getItem('app_dialect') || 'msa';
    setDialect(savedDialect);

    // Initialize model from user settings
    if (modelSettings.default_chat_model && !currentModel) {
      setCurrentModel(modelSettings.default_chat_model);
    }
  }, [project, modelSettings.default_chat_model, currentModel]);

  // Load conversation from DB if conversationId is provided
  useEffect(() => {
    if (conversationIdParam) {
      loadConversation(conversationIdParam).then(({ messages: loadedMsgs }) => {
        const uiMessages: Message[] = loadedMsgs.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
          model: m.model_used || undefined,
          cost: m.cost || undefined,
        }));
        setMessages(uiMessages);
      }).catch(() => {
        // Error already handled in hook
      });
    } else {
      // New conversation - clear state
      clearCurrentConversation();
      setMessages([]);
    }
  }, [conversationIdParam]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string, chatMode: ChatMode, selectedDialect: string) => {
    setIsError(false);
    // Update dialect in local storage if changed
    if (selectedDialect !== localStorage.getItem('app_dialect')) {
      localStorage.setItem('app_dialect', selectedDialect);
    }

    // Create conversation if this is the first message
    let convId = currentConversation?.id;
    if (!convId) {
      try {
        const newConv = await createConversation(projectId || undefined, content.slice(0, 50), chatMode);
        convId = newConv.id;
        // Update URL without reloading
        window.history.replaceState({}, '', `/chat?conversationId=${convId}`);
      } catch (error) {
        toast.error(t('errors.createConversation'));
        return;
      }
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to DB
    try {
      const savedUserMsg = await addMessage(convId, 'user', content);
      // Update the ID to match the DB
      setMessages(prev => prev.map(m => 
        m.id === userMessage.id ? { ...m, id: savedUserMsg.id } : m
      ));
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Build messages for API (use DB messages + new user message)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Include memories in context
      const approvedMemories = memories.filter(m => (m as any).status === 'approved' || !(m as any).status);
      const memoryContext = approvedMemories
        .map(m => `${m.category}: ${m.content}`)
        .join('\n');

      // Get session info - supports both authenticated and anonymous users
      const { data: { session } } = await supabase.auth.getSession();
      const anonymousSessionId = localStorage.getItem('anonymous_session_id');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else if (anonymousSessionId) {
        headers['x-session-id'] = anonymousSessionId;
      } else {
        throw new Error('No session available. Please sign in or start a trial.');
      }

      const resp = await fetchWithRetry(AI_GATEWAY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'chat',
          messages: apiMessages,
          mode: chatMode,
          model: currentModel, // Direct model selection
          project_id: projectId,
          conversation_id: convId,
          system_instructions: project?.system_instructions,
          memory_context: memoryContext,
          dialect: selectedDialect,
        }),
        signal: abortControllerRef.current.signal,
        timeout: 60000,
        retries: 2,
      });

      if (!resp.ok) {
        let errorMsg = 'Failed to get response';
        let errorCode = '';
        try {
           const error = await resp.json();
           errorMsg = error.message || error.error || errorMsg;
           errorCode = error.code || '';
           
           // Handle trial limit
           if (resp.status === 402 && error.action === 'signup') {
             toast.error(t('chat.trialLimitReached') || 'Trial limit reached. Please sign up to continue!', {
               action: {
                 label: t('common.signUp'),
                 onClick: () => window.location.href = '/auth',
               },
             });
             setIsLoading(false);
             return;
           }
        } catch {
           errorMsg = `HTTP Error ${resp.status}`;
        }
        throw new Error(errorMsg);
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
      let usageData: any = null;

      // Get model display name from response headers or settings
      const modelUsed = resp.headers.get('X-Model-Used');
      const modelInfo = availableModels?.chatModels?.find(m => m.id === modelUsed);
      const modelName = modelInfo?.name || modelUsed || currentModel || 'AI';

      const assistantMessageId = crypto.randomUUID();
      
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          model: modelName,
        } as Message,
      ]);

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
            // Check for usage data
            if (parsed.usage) {
              usageData = parsed.usage;
            }

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
            // Incomplete JSON, continue buffering
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
            if (parsed.usage) {
              usageData = parsed.usage;
            }
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

      // Calculate cost if not provided by backend but usage is
      // Placeholder rate (approximate for GPT-4o like models)
      // This is a client-side estimation fall-back
      let calculatedCost = 0;
      if (usageData) {
         // This logic depends on the model. For now we use a generic placeholder rate.
         const inputRate = 5.0 / 1000000; // $5 per 1M tokens
         const outputRate = 15.0 / 1000000; // $15 per 1M tokens
         calculatedCost = (usageData.prompt_tokens || 0) * inputRate + (usageData.completion_tokens || 0) * outputRate;
      } else {
         // Fallback if no usage data at all (e.g. estimate based on string length)
         // 1 token ~= 4 chars
         const inputTokens = content.length / 4;
         const outputTokens = assistantContent.length / 4;
         calculatedCost = (inputTokens * 5.0 / 1000000) + (outputTokens * 15.0 / 1000000);
      }

      // Ensure we display at least some cost for verification if content exists
      if (calculatedCost < 0.000001 && assistantContent.length > 0) {
         calculatedCost = 0.000001;
      }

      // Update message with cost
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, cost: calculatedCost } : m
        )
      );

      setSessionCost(prev => prev + calculatedCost);

      // Save assistant message to DB
      if (assistantContent && convId) {
        try {
          const savedAssistantMsg = await addMessage(convId, 'assistant', assistantContent, {
            model_used: modelName,
            cost: calculatedCost
          });
          // Update ID
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, id: savedAssistantMsg.id } : m
          ));
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }

      // Get message count after adding user + assistant
      const currentMessageCount = messages.length + 2;

      // Check if we should trigger auto-summarization (every 20 messages)
      if (currentMessageCount > 0 && currentMessageCount % 20 === 0 && convId) {
        try {
          console.log('Triggering auto-summarization at', currentMessageCount, 'messages');
          const summaryResp = await supabase.functions.invoke('summarize-conversation', {
            body: { conversation_id: convId }
          });
          if (summaryResp.data?.summary) {
            toast.success('Conversation summarized to save context');
          }
        } catch (err) {
          console.error('Auto-summarization failed:', err);
        }
      }

      // Check for memory extraction
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && messages.length >= 4) {
          const extractionResp = await supabase.functions.invoke('extract-memory', {
            body: {
              messages: apiMessages,
              project_id: projectId,
              conversation_id: convId,
              user_id: user.id
            }
          });

          if (extractionResp.data?.saved_count > 0) {
            toast.info(`${extractionResp.data.saved_count} memory suggestion(s) extracted. Review in Memory Bank.`);
            fetchMemories();
          }
        }
      } catch (err) {
        console.error('Memory extraction failed', err);
      }

    } catch (error) {
      setIsError(true);
      if (error instanceof Error && error.name === 'AbortError') {
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

  const handleCorrectDialect = (content: string) => {
    const correctionPrompt = `Please rewrite the last response in strict ${dialect} dialect. Make sure to use characteristic expressions and vocabulary of this dialect.`;
    handleSend(correctionPrompt, mode, dialect);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  if (isLoadingMessages) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingIndicator text={t('common.loading') || 'Loading...'} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={`flex-1 flex flex-col overflow-hidden relative mode-${mode}-bg`}>
        {/* Header extras */}
        <div className="absolute top-2 right-4 z-10 flex items-center gap-4">
           <CostMeter sessionCost={sessionCost} />
           <Sheet open={isMemoryOpen} onOpenChange={setIsMemoryOpen}>
              <SheetTrigger asChild>
                <div onClick={() => setIsMemoryOpen(true)} className="relative">
                  <MemoryBadge count={memories.length} />
                  {proposedMemories.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full animate-pulse flex items-center justify-center text-[8px] text-white font-bold">
                      {proposedMemories.length}
                    </span>
                  )}
                </div>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <MemoryManager
                  memories={memories}
                  proposedMemories={proposedMemories}
                  onAdd={addMemory}
                  onUpdate={updateMemory}
                  onDelete={deleteMemory}
                  onApprove={approveMemory}
                  onReject={rejectMemory}
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
                  onCorrectDialect={handleCorrectDialect}
                />
              ))}
              {isLoading && !messages[messages.length-1]?.role.includes('assistant') && (
                 <div className="px-4 py-6">
                    <LoadingIndicator text={t('chat.thinking') || 'Thinking...'} />
                 </div>
              )}
            </div>
          )}
        </ScrollArea>

        {isError && (
          <div className="p-2 flex justify-center bg-destructive/10">
            <Button variant="outline" size="sm" onClick={() => handleSend(messages[messages.length-1].content, mode, dialect)} className="text-destructive border-destructive/20 hover:bg-destructive/10">
              {t('common.retry') || 'Retry'}
            </Button>
          </div>
        )}


        {/* Input area */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          onStop={handleStop}
          message={message}
          setMessage={setMessage}
          mode={mode}
          setMode={setMode}
          dialect={dialect}
          setDialect={setDialect}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          visibleModels={visibleModels}
        />
      </div>
    </MainLayout>
  );
}
