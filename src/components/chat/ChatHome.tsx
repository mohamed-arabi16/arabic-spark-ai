import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, FolderPlus, History, Send, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, reducedMotionVariants } from '@/lib/motion';

interface ChatHomeProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
  isLoading?: boolean;
}

export function ChatHome({ message, setMessage, onSend, isLoading }: ChatHomeProps) {
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
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
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
      <motion.div 
        className="w-full max-w-2xl space-y-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome section */}
        <motion.div 
          className="text-center space-y-4"
          variants={staggerItem}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {t('chat.howCanIHelp')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t('chat.helperText')}
          </p>
        </motion.div>

        {/* Main input area — ChatGPT style */}
        <motion.div 
          className="relative"
          variants={staggerItem}
        >
          <div className="glass-card p-4 md:p-6">
            <Textarea
              ref={textareaRef}
              placeholder={t('chat.askAnything')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full min-h-[120px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-lg leading-relaxed p-0',
                isRTL && 'text-right'
              )}
              disabled={isLoading}
              dir="auto"
            />
            
            {/* Send button */}
            <div className={cn(
              'flex items-center justify-between mt-4 pt-4 border-t border-border/30',
              isRTL && 'flex-row-reverse'
            )}>
              <p className="text-xs text-muted-foreground hidden md:block">
                {t('chat.inputFooter')}
              </p>
              <Button
                size="lg"
                className={cn(
                  'gap-2 px-6 transition-all',
                  message.trim()
                    ? 'bg-primary hover:brightness-110'
                    : 'bg-muted text-muted-foreground'
                )}
                disabled={!message.trim() || isLoading}
                onClick={onSend}
              >
                <Send className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden md:inline">{t('common.send') || 'Send'}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div 
          className={cn(
            'flex items-center justify-center gap-3 flex-wrap',
            isRTL && 'flex-row-reverse'
          )}
          variants={staggerItem}
        >
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={action.onClick}
            >
              <action.icon className="h-4 w-4" strokeWidth={1.5} />
              {action.label}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            </Button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
