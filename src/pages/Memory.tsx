import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { MemoryList } from '@/components/memory/MemoryList';
import { useMemory } from '@/hooks/useMemory';
import { useProjects } from '@/hooks/useProjects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Search, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { prefersReducedMotion, fadeInUp } from '@/lib/motion';
import { getProjectName } from '@/lib/utils';

export default function Memory() {
  const { t } = useTranslation();
  const reducedMotion = prefersReducedMotion();
  const { projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { 
    memories, 
    proposedMemories, 
    fetchMemories, 
    approveMemory, 
    rejectMemory, 
    deleteMemory, 
    updateMemory,
    exportData,
    isExporting
  } = useMemory(
    selectedProject === 'all' ? undefined : selectedProject
  );

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories, selectedProject]);

  const handleSelectionChange = (id: string, checked: boolean) => {
    const newSet = new Set(selectedItems);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedItems(newSet);
  };

  const handleBulkApprove = async () => {
    for (const id of selectedItems) {
      await approveMemory(id);
    }
    setSelectedItems(new Set());
  };

  const handleBulkReject = async () => {
    for (const id of selectedItems) {
      await rejectMemory(id);
    }
    setSelectedItems(new Set());
  };

  const projectNameResolver = (projectId: string | null | undefined) => 
    getProjectName(projectId, projects, { 
      global: t('memory.global'), 
      notFound: t('memory.projectSpecific') 
    });

  const filteredMemories = memories.filter(m => 
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProposed = proposedMemories.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const MotionDiv = reducedMotion ? 'div' : motion.div;

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="glass-subtle border-b border-border/50 p-6 md:p-8">
          <MotionDiv
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
            {...(reducedMotion ? {} : { variants: fadeInUp, initial: "hidden", animate: "visible" })}
          >
            <PageHeader
              title={t('memory.title')}
              subtitle={t('memory.subtitle')}
              icon={Brain}
            >
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button
                  variant="glass"
                  onClick={() => exportData()}
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t('memory.exportAll')}
                </Button>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t('memory.allProjects')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('memory.allProjects')}</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PageHeader>
          </MotionDiv>

          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('memory.searchPlaceholder')}
              className="ps-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <Tabs defaultValue="approved" className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="approved">
                  {t('memory.approved')} ({filteredMemories.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  {t('memory.pending')} ({filteredProposed.length})
                </TabsTrigger>
              </TabsList>

              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.size} {t('memory.itemSelected')}
                  </span>
                  <Button size="sm" variant="glass" onClick={handleBulkApprove}>
                    {t('memory.bulkApprove')}
                  </Button>
                  <Button size="sm" variant="glass" onClick={handleBulkReject}>
                    {t('memory.bulkReject')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                    {t('common.clearSelection')}
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="approved">
              {filteredMemories.length === 0 ? (
                <EmptyState
                  icon={Brain}
                  title={t('memory.noMemories')}
                  description={t('memory.autoCreatedDesc')}
                />
              ) : (
                <MemoryList
                  memories={filteredMemories}
                  onDelete={deleteMemory}
                  onUpdate={async (id, content) => { await updateMemory(id, { content }); }}
                  getProjectName={projectNameResolver}
                />
              )}
            </TabsContent>

            <TabsContent value="pending">
              {filteredProposed.length === 0 ? (
                <EmptyState
                  icon={Brain}
                  title={t('memory.noPending')}
                  description={t('memory.noPendingMemoriesDesc')}
                />
              ) : (
                <MemoryList
                  memories={filteredProposed}
                  isPending
                  selectedItems={selectedItems}
                  onSelectionChange={handleSelectionChange}
                  onApprove={approveMemory}
                  onReject={rejectMemory}
                  getProjectName={projectNameResolver}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
