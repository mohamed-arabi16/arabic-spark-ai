import { Sparkles, MessageSquare, Image, Search, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: MessageSquare,
    title: 'Write content',
    prompt: 'Help me write engaging social media content about...',
  },
  {
    icon: Brain,
    title: 'Explain concepts',
    prompt: 'Explain the concept of machine learning in simple terms',
  },
  {
    icon: Image,
    title: 'Generate images',
    prompt: 'Create an image of a futuristic cityscape at sunset',
  },
  {
    icon: Search,
    title: 'Research topics',
    prompt: 'Research the latest trends in renewable energy',
  },
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      {/* Logo and welcome */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">How can I help you today?</h1>
        <p className="text-muted-foreground max-w-md">
          I can help you write, brainstorm, analyze, and create. Choose a mode above for different capabilities.
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.title}
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 text-left hover:bg-secondary/50 hover:border-primary/30 transition-all group"
            onClick={() => onSuggestionClick(suggestion.prompt)}
          >
            <div className="flex items-center gap-2">
              <suggestion.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-medium">{suggestion.title}</span>
            </div>
            <span className="text-sm text-muted-foreground line-clamp-2">
              {suggestion.prompt}
            </span>
          </Button>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          💡 Tip: Use <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">Shift + Enter</kbd> for new lines
        </p>
      </div>
    </div>
  );
}
