import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BrainCircuit } from 'lucide-react';

interface ExtractedFact {
  content: string;
  category: string;
}

interface MemorySuggestionProps {
  fact: ExtractedFact;
  onSave: () => void;
  onDismiss: () => void;
}

export function showMemorySuggestion(fact: ExtractedFact, onSave: () => void) {
  toast.custom((t) => (
    <div className="bg-background border rounded-lg shadow-lg p-4 w-full max-w-sm flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full text-primary">
          <BrainCircuit className="h-4 w-4" />
        </div>
        <div>
          <h4 className="font-medium text-sm">New memory found</h4>
          <p className="text-sm text-muted-foreground mt-1">
            "{fact.content}"
          </p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => toast.dismiss(t)}>
          Dismiss
        </Button>
        <Button size="sm" onClick={() => {
          onSave();
          toast.dismiss(t);
        }}>
          Save Memory
        </Button>
      </div>
    </div>
  ), { duration: 10000 });
}
