import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractedFact {
  id?: string;
  content: string;
  category: string;
}

// Storage key for dismissed memory suggestions
const DISMISSED_KEY = 'dismissed_memory_suggestions';

function getDismissedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function dismissMemory(id: string) {
  const dismissed = getDismissedIds();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  }
}

function isMemoryDismissed(id: string): boolean {
  return getDismissedIds().includes(id);
}

export function showMemorySuggestion(
  fact: ExtractedFact,
  onSave: () => void,
  memoryId?: string
) {
  // Generate a stable ID for tracking dismissals
  const id = memoryId || `mem_${fact.content.slice(0, 20).replace(/\s/g, '_')}_${Date.now()}`;
  
  // Don't show if already dismissed
  if (isMemoryDismissed(id)) {
    return;
  }

  toast.custom(
    (t) => (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full",
          "bg-primary/10 border border-primary/20 backdrop-blur-sm",
          "shadow-sm max-w-sm animate-in slide-in-from-top-2"
        )}
      >
        <BrainCircuit className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm truncate flex-1 max-w-[180px]" title={fact.content}>
          {fact.content.length > 35 ? `${fact.content.slice(0, 35)}...` : fact.content}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full hover:bg-green-500/20 hover:text-green-600"
            onClick={() => {
              onSave();
              dismissMemory(id);
              toast.dismiss(t);
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full hover:bg-destructive/20 hover:text-destructive"
            onClick={() => {
              dismissMemory(id);
              toast.dismiss(t);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    ),
    { 
      duration: 8000,
      position: 'top-center',
      className: 'bg-transparent shadow-none border-0',
      onDismiss: () => dismissMemory(id),
    }
  );
}

// Utility to clear all dismissed memories (for settings/debug)
export function clearDismissedMemories() {
  localStorage.removeItem(DISMISSED_KEY);
}
