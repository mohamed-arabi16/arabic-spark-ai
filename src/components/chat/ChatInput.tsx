import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModeSelector, ChatMode } from './ModeSelector';
import { Send, Paperclip, Mic, Square, Loader2, Info } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  onSend: (message: string, mode: ChatMode) => void;
  isLoading?: boolean;
  onStop?: () => void;
  message: string;
  setMessage: (message: string) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  activeModel?: string;
}

export function ChatInput({ onSend, isLoading, onStop, message, setMessage, mode, setMode, activeModel }: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [modelName, setModelName] = useState('GPT-5.2');

  useEffect(() => {
    // Priority: Prop (from project/global) > localStorage > Default
    let model = activeModel;
    if (!model) {
      model = localStorage.getItem('app_default_model') || 'gpt-5.2';
    }

    const display = model === 'gpt-5.2' ? 'GPT-5.2' :
                    model === 'gpt-4' ? 'GPT-4' :
                    model === 'claude-3-opus' ? 'Claude 3' : model;
    setModelName(display);
  }, [activeModel]);

  const { isRecording, isConnecting, toggleRecording } = useVoiceInput({
    onTranscript: (text) => {
      setMessage(message ? message + ' ' + text : text);
      setPartialTranscript('');
    },
    onPartialTranscript: setPartialTranscript,
  });

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

  const displayText = partialTranscript || message;

  return (
    <div className="border-t border-border bg-background p-3 md:p-4 safe-area-bottom">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Mode selector & Model Info */}
        <div className={cn(
          "flex items-center justify-between px-1",
          isRecording && "opacity-50"
        )}>
           <ModeSelector mode={mode} onModeChange={setMode} />

           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help bg-secondary/50 px-2 py-1 rounded-full">
                   <span>{t('settings.model')}: {modelName}</span>
                   <Info className="h-3 w-3" />
                 </div>
               </TooltipTrigger>
               <TooltipContent>
                 <p>{t('settings.modelTradeoff')}</p>
                 <p className="text-xs opacity-70 mt-1">{t('settings.defaultModelDesc')}</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
        </div>

        {/* Input area */}
        <div className="relative flex items-end gap-2 p-2 md:p-3 bg-secondary/30 rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          {/* Attachment button - hide on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hidden md:flex"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            placeholder={isRecording ? '🎙️ Listening...' : t('chat.askAnything')}
            value={displayText}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base",
              isRecording && "text-muted-foreground italic"
            )}
            rows={1}
            disabled={isRecording}
            dir="auto"
          />

          {/* Voice button */}
          <Button
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 transition-all",
              isRecording && "animate-pulse",
              !isRecording && "text-muted-foreground hover:text-foreground"
            )}
            onClick={toggleRecording}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-5 w-5" />
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
              disabled={!message.trim() || isRecording}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Cost indicator - hide on mobile */}
        <p className="text-xs text-muted-foreground text-center hidden md:block">
          {t('chat.inputFooter')}
        </p>
      </div>
    </div>
  );
}
