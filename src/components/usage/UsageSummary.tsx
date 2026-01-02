import { UsageSummary } from '@/hooks/useUsage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, MessageSquare, Image, Zap } from 'lucide-react';

interface UsageSummaryProps {
  summary: UsageSummary | null;
}

export function UsageSummaryCards({ summary }: UsageSummaryProps) {
  if (!summary) return null;

  const items = [
    {
      title: 'Total Cost',
      value: `$${summary.total_cost.toFixed(2)}`,
      icon: Coins,
      description: 'Estimated cost for this period',
    },
    {
      title: 'Tokens Used',
      value: summary.total_tokens.toLocaleString(),
      icon: Zap,
      description: 'Input and output tokens',
    },
    {
      title: 'Messages',
      value: summary.total_messages.toLocaleString(),
      icon: MessageSquare,
      description: 'Total chat messages sent',
    },
    {
      title: 'Images',
      value: summary.total_images.toLocaleString(),
      icon: Image,
      description: 'Generated images',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.title}
            </CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">
              {item.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
