import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage, Message } from '@/components/chat/ChatMessage';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatMode } from '@/components/chat/ModeSelector';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

    // TODO: Integrate with OpenAI API via edge function
    // For now, simulate a response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `This is a placeholder response. The AI integration with OpenAI will be implemented next. You sent: "${content}" using ${mode} mode.`,
        timestamp: new Date(),
        model: mode === 'fast' ? 'gpt-5-mini' : mode === 'deep' ? 'gpt-5.2' : 'gpt-5-mini',
        cost: 0.0001,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion, 'standard');
  };

  const handleStop = () => {
    setIsLoading(false);
    // TODO: Implement stream cancellation
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages area */}
        <ScrollArea ref={scrollRef} className="flex-1">
          {messages.length === 0 ? (
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="max-w-4xl mx-auto pb-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <ChatMessage
                  message={{
                    id: 'loading',
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                  }}
                  isStreaming
                />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <ChatInput onSend={handleSend} isLoading={isLoading} onStop={handleStop} />
      </div>
    </MainLayout>
  );
}
