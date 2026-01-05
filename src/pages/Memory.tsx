import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { MemoryList } from '@/components/memory/MemoryList';
import { useMemory } from '@/hooks/useMemory';
import { useProjects } from '@/hooks/useProjects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Brain, Filter, Search, Trash2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/EmptyState';

export default function Memory() {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { memories, proposedMemories, fetchMemories, approveMemory, rejectMemory, deleteMemory, updateMemory } = useMemory(
    selectedProject === 'all' ? undefined : selectedProject
  );

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories, selectedProject]);

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

        <div className="flex-1 overflow-hidden p-6">
           {memories.length === 0 && proposedMemories.length === 0 && !searchQuery ? (
             <EmptyState
               icon={Brain}
               title={t('memory.noMemories')}
               description={t('memory.autoCreatedDesc')}
             />
           ) : (
             <MemoryList
               memories={memories.filter(m => 
                 !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
               )}
               onApprove={approveMemory}
               onReject={rejectMemory}
               onDelete={deleteMemory}
               onUpdate={async (id, content) => { await updateMemory(id, { content }); }}
             />
           )}
        </div>
      </div>
    </MainLayout>
  );
}
