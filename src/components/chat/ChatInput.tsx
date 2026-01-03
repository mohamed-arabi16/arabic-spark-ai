import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModeSelector, ChatMode } from './ModeSelector';
import { Send, Paperclip, Mic, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, mode: ChatMode) => void;
  isLoading?: boolean;
  onStop?: () => void;
  message: string;
  setMessage: (message: string) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export function ChatInput({ onSend, isLoading, onStop, message, setMessage, mode, setMode }: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim(), mode);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Mode selector */}
        <div className="flex items-center justify-center">
          <ModeSelector mode={mode} onModeChange={setMode} />
        </div>

        {/* Input area */}
        <div className="relative flex items-end gap-2 p-3 bg-secondary/30 rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          {/* Attachment button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            placeholder={t('chat.askAnything')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base"
            rows={1}
          />

          {/* Voice button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Mic className="h-5 w-5" />
          </Button>

          {/* Send/Stop button */}
          {isLoading ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-9 w-9 shrink-0"
              onClick={onStop}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className={cn(
                'h-9 w-9 shrink-0 transition-all',
                message.trim()
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground'
              )}
              disabled={!message.trim()}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Cost indicator */}
        <p className="text-xs text-muted-foreground text-center">
          {t('chat.inputFooter')}
        </p>
      </div>
    </div>
  );
}
