import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ExternalLink, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopConversation {
  id: string;
  title: string | null;
  total_cost: number | null;
  total_tokens: number | null;
  project_id: string | null;
  project_name?: string;
}

interface TopConversationsTableProps {
  conversations: TopConversation[];
  isLoading?: boolean;
}

export function TopConversationsTable({ conversations, isLoading }: TopConversationsTableProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === 'rtl';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('usage.topConversations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('usage.topConversations')}
          </CardTitle>
          <CardDescription>{t('usage.topConversationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('usage.noConversationsYet')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleOpenConversation = (id: string) => {
    navigate(`/chat?conversationId=${id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('usage.topConversations')}
        </CardTitle>
        <CardDescription>{t('usage.topConversationsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={isRTL ? 'text-right' : ''}>{t('usage.conversation')}</TableHead>
              <TableHead className={isRTL ? 'text-right' : ''}>{t('projects.title')}</TableHead>
              <TableHead className={cn('text-center', isRTL && 'text-right')}>{t('usage.tokens')}</TableHead>
              <TableHead className={cn('text-center', isRTL && 'text-right')}>{t('usage.cost')}</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv, index) => (
              <TableRow key={conv.id} className="group">
                <TableCell className={isRTL ? 'text-right' : ''}>
                  <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[200px]">
                      {conv.title || t('chat.untitled')}
                    </span>
                    {index < 3 && (
                      <Badge 
                        variant={index === 0 ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] px-1.5',
                          index === 0 && 'bg-amber-500'
                        )}
                      >
                        #{index + 1}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className={isRTL ? 'text-right' : ''}>
                  <span className="text-sm text-muted-foreground">
                    {conv.project_name || '—'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono">
                    {(conv.total_tokens || 0).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono text-primary">
                    ${(conv.total_cost || 0).toFixed(4)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleOpenConversation(conv.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
