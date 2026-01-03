import { Sparkles, MessageSquare, Image, Search, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation, Trans } from 'react-i18next';

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const { t } = useTranslation();

  const suggestions = [
    {
      icon: MessageSquare,
      title: t('chat.writeContent'),
      prompt: t('chat.writeContentDesc'),
    },
    {
      icon: Brain,
      title: t('chat.explainConcepts'),
      prompt: t('chat.explainConceptsDesc'),
    },
    {
      icon: Image,
      title: t('chat.generateImages'),
      prompt: t('chat.generateImagesDesc'),
    },
    {
      icon: Search,
      title: t('chat.researchTopics'),
      prompt: t('chat.researchTopicsDesc'),
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      {/* Logo and welcome */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">{t('chat.howCanIHelp')}</h1>
        <p className="text-muted-foreground max-w-md">
          {t('chat.helperText')}
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.title}
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 text-start hover:bg-secondary/50 hover:border-primary/30 transition-all group"
            onClick={() => onSuggestionClick(suggestion.prompt)}
          >
            <div className="flex items-center gap-2">
              <suggestion.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">{suggestion.title}</span>
            </div>
            <span className="text-sm text-muted-foreground line-clamp-2 text-start">
              {suggestion.prompt}
            </span>
          </Button>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          💡 <Trans
            i18nKey="chat.tip"
            components={[
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100" />
            ]}
          />
        </p>
      </div>
    </div>
  );
}
