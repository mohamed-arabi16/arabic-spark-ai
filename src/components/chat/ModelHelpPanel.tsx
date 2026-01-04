import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap, Sparkles, Brain, Search, Image, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

interface ModelHelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const models = [
  {
    id: 'fast',
    label: 'Fast',
    icon: Zap,
    color: 'text-green-500',
    description: 'Fastest response time, lowest cost. Best for quick questions and simple tasks.',
    cost: '$0.10 / 1M input'
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: Sparkles,
    color: 'text-blue-500',
    description: 'Balanced performance and cost. Good for most daily tasks and content generation.',
    cost: '$1.00 / 1M input'
  },
  {
    id: 'deep',
    label: 'Deep',
    icon: Brain,
    color: 'text-purple-500',
    description: 'High reasoning capability. Best for complex analysis, coding, and math.',
    cost: '$2.50 / 1M input'
  },
  {
    id: 'pro',
    label: 'Pro',
    icon: Crown,
    color: 'text-amber-500',
    description: 'Most capable model. Superior for creative writing and nuanced understanding.',
    cost: '$5.00 / 1M input'
  },
  {
    id: 'research',
    label: 'Research',
    icon: Search,
    color: 'text-sky-500',
    description: 'Integrated web search. finds real-time information and cites sources.',
    cost: '$2.50 / 1M input'
  },
  {
    id: 'image',
    label: 'Image',
    icon: Image,
    color: 'text-pink-500',
    description: 'Generates images from text descriptions.',
    cost: '$0.04 / image'
  },
];

export function ModelHelpPanel({ open, onOpenChange }: ModelHelpPanelProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('settings.models') || "AI Models"}</DialogTitle>
          <DialogDescription>
            {t('settings.modelsDescription') || "Choose the right model for your task. Costs are per 1 million tokens (approx 750,000 words)."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {models.map((model) => (
            <div key={model.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <model.icon className={cn("h-5 w-5", model.color)} />
                <span className="font-semibold">{model.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3 min-h-[40px]">
                {model.description}
              </p>
              <div className="text-xs font-medium bg-secondary/50 inline-block px-2 py-1 rounded">
                {model.cost}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
