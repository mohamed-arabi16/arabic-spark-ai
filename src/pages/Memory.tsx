import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { MemoryList } from '@/components/memory/MemoryList';
import { useMemory } from '@/hooks/useMemory';
import { useProjects } from '@/hooks/useProjects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Brain, Search, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/EmptyState';

export default function Memory() {
  const { t } = useTranslation();
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

  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return t('memory.global');
    const project = projects.find(p => p.id === projectId);
    return project?.name || t('memory.projectSpecific');
  };

  const filteredMemories = memories.filter(m => 
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProposed = proposedMemories.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                {t('memory.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('memory.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => exportData()}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 me-2" />
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
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('memory.searchPlaceholder')}
                className="ps-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="approved" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="approved">
                  {t('memory.approved')} ({filteredMemories.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  {t('memory.pending')} ({filteredProposed.length})
                </TabsTrigger>
              </TabsList>

              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.size} {t('memory.itemSelected')}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleBulkApprove}>
                    {t('memory.bulkApprove')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkReject}>
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
                  getProjectName={getProjectName}
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
                  getProjectName={getProjectName}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
