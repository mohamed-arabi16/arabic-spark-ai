import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { normalizeArabic } from '@/lib/utils';
import { useConversations, ConversationWithSnippet } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { useMemory } from '@/hooks/useMemory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquare, ArrowRight, Trash2, Archive, Calendar as CalendarIcon, Filter, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MemoryList } from '@/components/memory/MemoryList';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';

export default function History() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project');
  
  const {
    conversations,
    isLoading,
    fetchConversations,
    deleteConversation,
    archiveConversation
  } = useConversations();

  const { projects } = useProjects();
  const {
    memories,
    proposedMemories,
    fetchMemories,
    fetchApprovedMemories,
    addMemory,
    updateMemory,
    deleteMemory,
    approveMemory,
    rejectMemory
  } = useMemory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>(projectParam || 'all');
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'research' | 'image'>('all');

  useEffect(() => {
    fetchConversations({ projectId: selectedProject === 'all' ? undefined : selectedProject });
  }, [fetchConversations, selectedProject]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const filteredConversations = conversations.filter(conv => {
    const normQuery = normalizeArabic(searchQuery);
    const normTitle = normalizeArabic(conv.title || '');
    const normSnippet = normalizeArabic(conv.snippet || '');

    const matchesSearch = normTitle.includes(normQuery) || normSnippet.includes(normQuery);
    const matchesType = filterType === 'all' || conv.mode === filterType;
    return matchesSearch && matchesType;
  });

  const groupConversationsByDate = (convs: ConversationWithSnippet[]) => {
    const groups: Record<string, ConversationWithSnippet[]> = {
      [t('history.today')]: [],
      [t('history.yesterday')]: [],
      [t('history.thisWeek')]: [],
      [t('history.older')]: [],
    };

    convs.forEach(conv => {
      const date = parseISO(conv.created_at);
      if (isToday(date)) {
        groups[t('history.today')].push(conv);
      } else if (isYesterday(date)) {
        groups[t('history.yesterday')].push(conv);
      } else if (isThisWeek(date)) {
        groups[t('history.thisWeek')].push(conv);
      } else {
        groups[t('history.older')].push(conv);
      }
    });

    return groups;
  };

  const groupedConversations = groupConversationsByDate(filteredConversations);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.name;
  };

  const getModeBadge = (mode: string) => {
    const colors: Record<string, string> = {
      fast: 'bg-green-100 text-green-800',
      standard: 'bg-blue-100 text-blue-800',
      deep: 'bg-purple-100 text-purple-800',
      pro: 'bg-orange-100 text-orange-800',
      research: 'bg-teal-100 text-teal-800',
      image: 'bg-pink-100 text-pink-800',
    };
    return colors[mode] || 'bg-gray-100 text-gray-800';
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight mb-2">{t('sidebar.history')}</h1>
            <p className="text-muted-foreground">{t('history.description')}</p>
          </div>

          <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="ps-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="conversations" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
              <TabsTrigger value="memory">Memory Timeline</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="conversations" className="flex-1 overflow-hidden m-0">
             <ScrollArea className="h-full">
              <div className="p-6 space-y-8">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title={t('history.noConversations')}
                    description="Your chat history will appear here once you start a conversation."
                    actionLabel="Start Chat"
                    onAction={() => navigate('/chat')}
                  />
                ) : (
                  Object.entries(groupedConversations).map(([dateGroup, items]) => (
                    items.length > 0 && (
                      <div key={dateGroup} className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground sticky top-0 bg-background py-2 z-10">
                          {dateGroup}
                        </h2>
                        <div className="grid gap-4">
                          {items.map((conv) => (
                            <Card key={conv.id} className="group hover:shadow-md transition-shadow">
                              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                  <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <span className="line-clamp-1">{conv.title || 'Untitled Conversation'}</span>
                                    <Badge variant="secondary" className={`text-xs font-normal ${getModeBadge(conv.mode || 'standard')}`}>
                                      {conv.mode}
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-2 text-xs">
                                    <CalendarIcon className="h-3 w-3" />
                                    {format(parseISO(conv.created_at), 'h:mm a')}
                                    {conv.project_id && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                           {getProjectName(conv.project_id) === 'General' ? <Rocket className="h-3 w-3" /> : null}
                                           {getProjectName(conv.project_id)}
                                        </span>
                                      </>
                                    )}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/chat?conversationId=${conv.id}`)}>
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteConversation(conv.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-3 pt-0">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {conv.snippet || 'No preview available'}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="memory" className="flex-1 overflow-hidden m-0">
             <ScrollArea className="h-full p-6">
               <MemoryList
                  memories={[...memories, ...proposedMemories]}
                  onUpdate={async (id, content) => { await updateMemory(id, { content }); }}
                  onDelete={deleteMemory}
                  onApprove={approveMemory}
                  onReject={rejectMemory}
                  getProjectName={(id) => {
                    if (!id) return 'Global';
                    const p = projects.find(p => p.id === id);
                    return p ? p.name : 'Unknown Project';
                  }}
                />
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
