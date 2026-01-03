import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, User, Copy, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  cost?: number;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Copied to clipboard');
  };

  return (
    <div
      className={cn(
        'group flex gap-4 px-4 py-6 animate-in-up',
        isUser ? 'bg-transparent' : 'bg-secondary/30'
      )}
    >
      <Avatar className={cn('h-8 w-8 shrink-0', isUser ? 'bg-primary' : 'bg-accent')}>
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          {message.model && (
            <span className="text-xs text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full border border-border/50">
              {message.model}
            </span>
          )}
        </div>

        <div 
          className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-primary prose-headings:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dir="auto"
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed m-0">{message.content}</p>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom link rendering for citations
                  a: ({ node, children, href, ...props }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  // Style code blocks
                  code: ({ node, className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-secondary px-1.5 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-flex ms-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-typing-dot mx-1" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-typing-dot" style={{ animationDelay: '400ms' }} />
                </span>
              )}
            </>
          )}
        </div>

        {/* Actions (visible on hover for assistant messages) */}
        {!isUser && !isStreaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent" onClick={copyToClipboard}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent">
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent">
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
            {message.cost !== undefined && message.cost > 0 && (
              <span className="ms-2 text-xs text-muted-foreground">
                ${message.cost.toFixed(4)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
