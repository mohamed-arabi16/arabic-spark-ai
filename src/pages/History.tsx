import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Clock, Trash2, Edit2, Archive, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useConversations, ConversationWithSnippet } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';

export default function History() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  
  const {
    conversations,
    isLoading,
    fetchConversations,
    updateConversation,
    archiveConversation,
    deleteConversation,
  } = useConversations();

  const { projects } = useProjects();

  useEffect(() => {
    fetchConversations({ archived: activeTab === 'archived' });
  }, [fetchConversations, activeTab]);

  const filteredConversations = conversations.filter(conv =>
    (conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     conv.snippet?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group by project for the "by project" tab
  const groupedByProject = filteredConversations.reduce((acc, conv) => {
    const projectId = conv.project_id || 'no-project';
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(conv);
    return acc;
  }, {} as Record<string, ConversationWithSnippet[]>);

  // Group by date for timeline view
  const groupedByDate = useMemo(() => {
    const groups: Record<DateGroup, ConversationWithSnippet[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    filteredConversations.forEach(conv => {
      const date = parseISO(conv.updated_at);
      if (isToday(date)) {
        groups.today.push(conv);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conv);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const dateGroupLabels: Record<DateGroup, string> = {
    today: t('history.today', 'Today'),
    yesterday: t('history.yesterday', 'Yesterday'),
    thisWeek: t('history.thisWeek', 'This Week'),
    older: t('history.older', 'Older'),
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Permanently delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await archiveConversation(id);
  };

  const handleRename = async (e: React.MouseEvent, conv: ConversationWithSnippet) => {
    e.stopPropagation();
    const newTitle = prompt('Rename conversation:', conv.title || '');
    if (newTitle && newTitle !== conv.title) {
      await updateConversation(conv.id, { title: newTitle });
      toast.success('Conversation renamed');
    }
  };

  const handleSelect = (conv: ConversationWithSnippet) => {
    navigate(`/chat?conversationId=${conv.id}`);
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'General';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'General';
  };

  const renderConversationCard = (conv: ConversationWithSnippet) => (
    <Card 
      key={conv.id} 
      className="hover:bg-accent hover:border-primary/30 transition-all cursor-pointer group" 
      onClick={() => handleSelect(conv)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          {conv.title || 'Untitled Conversation'}
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={(e) => handleRename(e, conv)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            {activeTab !== 'archived' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={(e) => handleArchive(e, conv.id)}
              >
                <Archive className="h-3 w-3" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 hover:text-destructive" 
              onClick={(e) => handleDelete(e, conv.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {conv.snippet || 'No messages yet'}
        </p>
        <div className="flex items-center gap-2">
          {conv.mode && (
            <Badge variant="secondary" className="text-xs">
              {conv.mode}
            </Badge>
          )}
          {conv.message_count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {conv.message_count} messages
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout title={t('sidebar.history')}>
      <div className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('sidebar.history')}</h1>
            <p className="text-muted-foreground text-sm md:text-lg">
              {t('history.description', 'View and manage your past conversations.')}
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="by-project">By Project</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-4 md:mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                {t('history.noConversations', 'No conversations found. Start a new chat!')}
              </div>
            ) : (
              <div className="space-y-6">
                {(Object.keys(groupedByDate) as DateGroup[]).map(group => {
                  const convs = groupedByDate[group];
                  if (convs.length === 0) return null;
                  return (
                    <div key={group}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        {dateGroupLabels[group]}
                      </h3>
                      <div className="grid gap-3 md:gap-4">
                        {convs.map(renderConversationCard)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="by-project" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : Object.keys(groupedByProject).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                No conversations found.
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedByProject).map(([projectId, convs]) => (
                  <div key={projectId}>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      {projectId === 'no-project' ? 'General' : getProjectName(projectId)}
                      <Badge variant="outline">{convs.length}</Badge>
                    </h3>
                    <div className="grid gap-4">
                      {convs.map(renderConversationCard)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                No archived conversations.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredConversations.map(renderConversationCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
