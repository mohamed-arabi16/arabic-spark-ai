import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { normalizeArabic, getProjectName } from '@/lib/utils';
import { useConversations, ConversationWithSnippet } from '@/hooks/useConversations';
import { useProjects } from '@/hooks/useProjects';
import { useMemory } from '@/hooks/useMemory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquare, ArrowRight, Trash2, Calendar as CalendarIcon, Filter, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MemoryList } from '@/components/memory/MemoryList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { SkeletonConversationList } from '@/components/ui/skeleton-list';
import { LTR } from '@/lib/bidi';

export default function History() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project');
  const isRTL = i18n.dir() === 'rtl';
  
  const {
    conversations,
    isLoading,
    fetchConversations,
    deleteConversation,
  } = useConversations();

  const { projects } = useProjects();
  const {
    memories,
    proposedMemories,
    fetchMemories,
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

  // Memoize filtered conversations to avoid recalculation on every render
  const filteredConversations = useMemo(() => {
    const normQuery = normalizeArabic(searchQuery);
    return conversations.filter(conv => {
      const normTitle = normalizeArabic(conv.title || '');
      const normSnippet = normalizeArabic(conv.snippet || '');

      const matchesSearch = normTitle.includes(normQuery) || normSnippet.includes(normQuery);
      const matchesType = filterType === 'all' || conv.mode === filterType;
      return matchesSearch && matchesType;
    });
  }, [conversations, searchQuery, filterType]);

  // Memoize date group labels to avoid creating new objects on every render
  const dateGroupLabels = useMemo(() => ({
    today: t('history.today'),
    yesterday: t('history.yesterday'),
    thisWeek: t('history.thisWeek'),
    older: t('history.older'),
  }), [t]);

  // Memoize grouped conversations to avoid recalculation on every render
  const groupedConversations = useMemo(() => {
    const groups: Record<string, ConversationWithSnippet[]> = {
      [dateGroupLabels.today]: [],
      [dateGroupLabels.yesterday]: [],
      [dateGroupLabels.thisWeek]: [],
      [dateGroupLabels.older]: [],
    };

    filteredConversations.forEach(conv => {
      const date = parseISO(conv.created_at);
      if (isToday(date)) {
        groups[dateGroupLabels.today].push(conv);
      } else if (isYesterday(date)) {
        groups[dateGroupLabels.yesterday].push(conv);
      } else if (isThisWeek(date)) {
        groups[dateGroupLabels.thisWeek].push(conv);
      } else {
        groups[dateGroupLabels.older].push(conv);
      }
    });

    return groups;
  }, [filteredConversations, dateGroupLabels]);

  // Memoize project name resolver to avoid creating new function on every render
  const projectNameResolver = useCallback((projectId: string | null) => 
    projectId ? getProjectName(projectId, projects, { global: '', notFound: '' }) || null : null,
  [projects]);

  const getModeBadge = (mode: string) => {
    const colors: Record<string, string> = {
      fast: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      deep: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      pro: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      research: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      image: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    };
    return colors[mode] || 'bg-secondary text-secondary-foreground';
  };

  const getModeLabel = (mode: string) => {
    const modeKey = `chat.modes.${mode}` as const;
    return t(modeKey) || mode;
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-6">
            <PageHeader
              title={t('history.title')}
              subtitle={t('history.description')}
            />
          </div>

          <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('history.searchPlaceholder')}
                className="ps-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('projects.title')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('memory.allProjects')}</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 me-2" />
                  <SelectValue placeholder={t('history.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('history.allTypes')}</SelectItem>
                  <SelectItem value="chat">{t('sidebar.chat')}</SelectItem>
                  <SelectItem value="research">{t('research.title')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="conversations" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="conversations">{t('history.conversations')}</TabsTrigger>
              <TabsTrigger value="memory">{t('history.memoryTimeline')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="conversations" className="flex-1 overflow-hidden m-0">
             <ScrollArea className="h-full">
              <div className="p-6 space-y-8">
                {isLoading ? (
                  <SkeletonConversationList count={5} />
                ) : filteredConversations.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title={t('history.noConversations')}
                    description={t('history.emptyDescription')}
                    actionLabel={t('history.startChat')}
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
                                <div className="space-y-1 flex-1 min-w-0">
                                  <CardTitle className="text-base font-medium flex items-center gap-2 flex-wrap">
                                    <span className="line-clamp-1">{conv.title || t('chat.untitled')}</span>
                                    <Badge variant="secondary" className={`text-xs font-normal ${getModeBadge(conv.mode || 'standard')}`}>
                                      {getModeLabel(conv.mode || 'standard')}
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-2 text-xs flex-wrap">
                                    <CalendarIcon className="h-3 w-3" />
                                    <LTR>{format(parseISO(conv.created_at), 'h:mm a')}</LTR>
                                    {conv.project_id && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                           {projectNameResolver(conv.project_id) === 'General' ? <Rocket className="h-3 w-3" /> : null}
                                           {projectNameResolver(conv.project_id)}
                                        </span>
                                      </>
                                    )}
                                  </CardDescription>
                                </div>
                                <div className={`flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground" 
                                    onClick={() => navigate(`/chat?conversationId=${conv.id}`)}
                                  >
                                    <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                                    onClick={() => deleteConversation(conv.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-3 pt-0">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {conv.snippet || t('history.noPreview')}
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
                  getProjectName={(id) => getProjectName(id, projects, {
                    global: t('memory.global'),
                    notFound: t('projects.title')
                  })}
                />
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
