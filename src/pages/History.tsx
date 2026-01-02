import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Clock, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  title: string;
  date: string;
  preview: string;
  messages: unknown[];
}

export default function History() {
  const navigate = useNavigate();
  // We'll read from localStorage for now to simulate persistence across pages
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('chat_history');
      return stored ? JSON.parse(stored) : [
        { id: '1', title: 'Marketing campaign ideas', date: new Date().toISOString(), preview: 'Here are some ideas for the summer campaign...', messages: [] },
        { id: '2', title: 'Code review help', date: new Date(Date.now() - 86400000).toISOString(), preview: 'Can you look at this React component...', messages: [] },
      ];
    } catch {
      return [];
    }
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      const newHistory = historyItems.filter(i => i.id !== id);
      setHistoryItems(newHistory);
      localStorage.setItem('chat_history', JSON.stringify(newHistory));
      toast.success('Conversation deleted');
    }
  };

  const handleRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = historyItems.find(i => i.id === id);
    if (!item) return;
    const newTitle = prompt('Rename conversation:', item.title);
    if (newTitle && newTitle !== item.title) {
        const newHistory = historyItems.map(i => i.id === id ? { ...i, title: newTitle } : i);
        setHistoryItems(newHistory);
        localStorage.setItem('chat_history', JSON.stringify(newHistory));
        toast.success('Conversation renamed');
    }
  };

  const handleSelect = (item: HistoryItem) => {
      navigate(`/chat?id=${item.id}`, { state: { conversation: item } });
  };

  return (
    <MainLayout>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Chat History</h1>
          <p className="text-muted-foreground text-lg">
            View and manage your past conversations.
          </p>
        </div>

        <div className="grid gap-4">
          {historyItems.map((item) => (
            <Card key={item.id} className="hover:bg-accent/50 transition-colors cursor-pointer group" onClick={() => handleSelect(item)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {item.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.date).toLocaleDateString()}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleRename(e, item.id)}>
                            <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={(e) => handleDelete(e, item.id)}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.preview}
                </p>
              </CardContent>
            </Card>
          ))}

           {historyItems.length === 0 && (
               <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                   No history found. Start a new chat!
               </div>
           )}
        </div>
      </div>
    </MainLayout>
  );
}
