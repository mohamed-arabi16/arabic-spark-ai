import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, FolderPlus, History, Send, Mail, Lightbulb, FileText, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { RoutingBadge } from './RoutingBadge';
import { ModelPicker } from './ModelPicker';
import { ChatMode } from './ModeSelector';

interface ModelInfo {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  tier: string;
  provider: string;
  available: boolean;
}

interface ChatHomeProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  isModelLoading?: boolean;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  dialect: string;
  setDialect: (dialect: string) => void;
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
  visibleModels?: ModelInfo[];
  routingMode?: 'auto' | 'manual';
  onRoutingModeChange?: (mode: 'auto' | 'manual') => void;
  routingReason?: string;
  isDefault?: boolean;
  defaultChatModel?: string;
}

const suggestedPrompts = [
  { icon: Mail, key: 'promptWriteEmail', prompt: 'Help me write a professional email to...' },
  { icon: Lightbulb, key: 'promptExplain', prompt: 'Explain this concept in simple terms:' },
  { icon: FileText, key: 'promptSummarize', prompt: 'Summarize this text for me:' },
  { icon: Palette, key: 'promptBrainstorm', prompt: 'Brainstorm creative ideas for...' },
];

export function ChatHome({
  message,
  setMessage,
  onSend,
  isLoading,
  isModelLoading,
  mode,
  setMode,
  dialect,
  setDialect,
  currentModel,
  onModelChange,
  visibleModels,
  routingMode = 'auto',
  onRoutingModeChange,
  routingReason,
  isDefault,
  defaultChatModel,
}: ChatHomeProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRTL = i18n.dir() === 'rtl';

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSend();
      }
    }
  };

  const handlePromptClick = (prompt: string) => {
    setMessage(prompt);
    textareaRef.current?.focus();
  };

  const quickActions = [
    {
      icon: FolderPlus,
      label: t('projects.newProject'),
      onClick: () => navigate('/projects'),
    },
    {
      icon: History,
      label: t('sidebar.history'),
      onClick: () => navigate('/history'),
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
      <motion.div 
        className="w-full max-w-2xl space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Top bar with model controls */}
        <motion.div 
          className={cn(
            'flex items-center gap-2 justify-center',
            isRTL && 'flex-row-reverse'
          )}
          variants={staggerItem}
        >
          <RoutingBadge
            routingMode={routingMode}
            onRoutingModeChange={onRoutingModeChange}
            currentModel={currentModel}
            routingReason={routingReason}
            isDefault={isDefault}
            className="text-xs"
          />
          <ModelPicker
            mode={mode}
            onModeChange={setMode}
            dialect={dialect}
            onDialectChange={setDialect}
            currentModel={currentModel}
            onModelChange={onModelChange}
            visibleModels={visibleModels}
            isLoading={isModelLoading}
            defaultChatModel={defaultChatModel}
          />
        </motion.div>

        {/* Welcome section - more compact */}
        <motion.div 
          className="text-center space-y-2"
          variants={staggerItem}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-1">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {t('chat.howCanIHelp')}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            {t('chat.helperText')}
          </p>
        </motion.div>

        {/* Main input area — compact */}
        <motion.div 
          className="relative"
          variants={staggerItem}
        >
          <div className="glass-card p-3 md:p-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                placeholder={t('chat.askAnything')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  'flex-1 min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base leading-relaxed p-2',
                  isRTL && 'text-right'
                )}
                disabled={isLoading}
                dir="auto"
                rows={1}
              />
              <Button
                size="icon"
                className={cn(
                  'shrink-0 h-10 w-10 rounded-full transition-all',
                  message.trim()
                    ? 'bg-primary hover:brightness-110'
                    : 'bg-muted text-muted-foreground'
                )}
                disabled={!message.trim() || isLoading}
                onClick={onSend}
                aria-label={t('chat.send')}
              >
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Suggested prompts — extends beyond input width */}
        <motion.div 
          className="relative"
          variants={staggerItem}
        >
          <div className={cn(
            'flex items-stretch justify-center gap-2 flex-wrap md:flex-nowrap',
            // On desktop, extend 25% beyond the container on each side
            'md:-mx-[12%]',
            isRTL && 'flex-row-reverse'
          )}>
            {suggestedPrompts.map((item) => (
              <button
                key={item.key}
                onClick={() => handlePromptClick(item.prompt)}
                className={cn(
                  'group flex-1 min-w-[140px] max-w-[180px] p-3 rounded-xl',
                  'bg-card/50 hover:bg-card/80 border border-border/30 hover:border-border/50',
                  'transition-all duration-200 text-start',
                  isRTL && 'text-end'
                )}
              >
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary mb-1.5 transition-colors" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground group-hover:text-foreground line-clamp-2 transition-colors">
                  {t(`chat.${item.key}`)}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div 
          className={cn(
            'flex items-center justify-center gap-3 flex-wrap pt-2',
            isRTL && 'flex-row-reverse'
          )}
          variants={staggerItem}
        >
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={action.onClick}
            >
              <action.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {action.label}
            </Button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
