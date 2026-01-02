import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const navigate = useNavigate();

  // Placeholder data - ideally this would come from a useHistory hook or similar
  const historyItems = [
      { id: '1', title: 'Marketing campaign ideas', date: '2 hours ago', preview: 'Here are some ideas for the summer campaign...' },
      { id: '2', title: 'Code review help', date: 'Yesterday', preview: 'Can you look at this React component and tell me...' },
      { id: '3', title: 'Arabic translation', date: '2 days ago', preview: 'Translate the following text to Arabic...' },
  ];

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
            <Card key={item.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate('/chat')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {item.title}
                </CardTitle>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Clock className="h-3 w-3" />
                    {item.date}
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
               <div className="text-center py-10 text-muted-foreground">
                   No history found. Start a new chat!
               </div>
           )}
        </div>
      </div>
    </MainLayout>
  );
}
