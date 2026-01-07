import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelPicker } from './ModelPicker';
import { RoutingBadge } from './RoutingBadge';
import { ChatMode } from './ModeSelector';
import { Send, Paperclip, Mic, Square, Loader2 } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface ModelInfo {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  tier: string;
  provider: string;
  available: boolean;
}

interface ChatInputProps {
  onSend: (message: string, mode: ChatMode, dialect: string) => void;
  isLoading?: boolean;
  isModelLoading?: boolean;
  onStop?: () => void;
  message: string;
  setMessage: (message: string) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  dialect: string;
  setDialect: (dialect: string) => void;
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
  visibleModels?: ModelInfo[];
  routingMode?: 'auto' | 'manual';
  onRoutingModeChange?: (mode: 'auto' | 'manual') => void;
}

export function ChatInput({
  onSend,
  isLoading,
  isModelLoading,
  onStop,
  message,
  setMessage,
  mode,
  setMode,
  dialect,
  setDialect,
  currentModel,
  onModelChange,
  visibleModels = [],
  routingMode = 'auto',
  onRoutingModeChange,
}: ChatInputProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [partialTranscript, setPartialTranscript] = useState('');

  const { isRecording, isConnecting, toggleRecording } = useVoiceInput({
    onTranscript: (text) => {
      setMessage(message ? message + ' ' + text : text);
      setPartialTranscript('');
    },
    onPartialTranscript: setPartialTranscript,
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim(), mode, dialect);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayText = partialTranscript || message;

  return (
    <div className="glass-subtle border-t border-border/30 p-4 md:p-5 safe-area-bottom">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Model & Dialect Picker */}
        <div
          className={cn(
            'flex items-center justify-between gap-2 flex-wrap',
            isRecording && 'opacity-50',
            isRTL && 'flex-row-reverse'
          )}
        >
          <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            {onRoutingModeChange && (
              <RoutingBadge
                routingMode={routingMode}
                onRoutingModeChange={onRoutingModeChange}
                currentModel={currentModel}
                taskType="chat"
              />
            )}
          </div>
          <ModelPicker
            mode={mode}
            onModeChange={setMode}
            dialect={dialect}
            onDialectChange={setDialect}
            currentModel={currentModel}
            onModelChange={onModelChange}
            visibleModels={visibleModels}
            isLoading={isModelLoading}
          />
        </div>

        {/* Input area — Glass card */}
        <div className="relative flex items-end gap-2 p-3 glass rounded-2xl transition-all duration-200 focus-within:border-primary/30">
          {/* Attachment button — disabled with tooltip */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground/50 cursor-not-allowed hidden md:flex"
            disabled
            title={t('chat.attachmentComingSoon') || 'File attachments coming soon'}
          >
            <Paperclip className="h-4 w-4" strokeWidth={1.5} />
          </Button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            placeholder={isRecording ? t('chat.listening') : t('chat.askAnything')}
            value={displayText}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base leading-relaxed',
              isRecording && 'text-muted-foreground italic'
            )}
            rows={1}
            disabled={isRecording}
            dir="auto"
          />

          {/* Voice button */}
          <Button
            variant={isRecording ? 'destructive' : 'ghost'}
            size="icon"
            className={cn(
              'h-9 w-9 shrink-0 transition-all',
              isRecording && 'animate-pulse',
              !isRecording && 'text-muted-foreground hover:text-foreground'
            )}
            onClick={toggleRecording}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <Square className="h-3 w-3" />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={1.5} />
            )}
          </Button>

          {/* Send/Stop button */}
          {isLoading ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-9 w-9 shrink-0"
              onClick={onStop}
            >
              <Square className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="icon"
              className={cn(
                'h-9 w-9 shrink-0 transition-all',
                message.trim()
                  ? 'bg-primary hover:brightness-110'
                  : 'bg-muted text-muted-foreground'
              )}
              disabled={!message.trim() || isRecording}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          )}
        </div>

        {/* Footer text */}
        <p className="text-xs text-muted-foreground text-center hidden md:block">
          {t('chat.inputFooter')}
        </p>
      </div>
    </div>
  );
}
