import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { useMemory, Memory as MemoryType } from '@/hooks/useMemory';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Brain,
  Search,
  Trash2,
  Check,
  XCircle,
  Edit2,
  Save,
  X,
  Globe,
  Folder,
  User,
  Heart,
  Lightbulb,
  Settings,
  CheckCheck,
  Filter,
} from 'lucide-react';

const categoryIcons: Record<string, any> = {
  preference: Heart,
  fact: User,
  instruction: Settings,
  style: Lightbulb,
  default: Brain,
};

const categoryColors: Record<string, string> = {
  preference: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  fact: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  instruction: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  style: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  default: 'bg-muted text-muted-foreground',
};

export default function Memory() {
  const { t } = useTranslation();
  const { projects, fetchProjects } = useProjects();
  const {
    memories,
    proposedMemories,
    isLoading,
    fetchMemories,
    updateMemory,
    deleteMemory,
    approveMemory,
    rejectMemory,
  } = useMemory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchProjects();
    fetchMemories();
  }, [fetchProjects, fetchMemories]);

  // Filter memories based on search, category, and project
  const filteredMemories = useMemo(() => {
    let list = activeTab === 'pending' ? proposedMemories : memories;

    if (activeTab === 'global') {
      list = memories.filter(m => m.is_global);
    } else if (activeTab === 'project' && selectedProject !== 'all') {
      list = memories.filter(m => m.project_id === selectedProject);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.content.toLowerCase().includes(query) ||
        m.key?.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      list = list.filter(m => m.category === selectedCategory);
    }

    return list;
  }, [memories, proposedMemories, activeTab, searchQuery, selectedCategory, selectedProject]);

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredMemories.map(m => m.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkApprove = async () => {
    const toApprove = Array.from(selectedItems);
    let successCount = 0;
    for (const id of toApprove) {
      try {
        await approveMemory(id);
        successCount++;
      } catch (e) {
        console.error('Failed to approve', id, e);
      }
    }
    toast.success(`Approved ${successCount} memories`);
    setSelectedItems(new Set());
  };

  const handleBulkReject = async () => {
    const toReject = Array.from(selectedItems);
    let successCount = 0;
    for (const id of toReject) {
      try {
        await rejectMemory(id);
        successCount++;
      } catch (e) {
        console.error('Failed to reject', id, e);
      }
    }
    toast.success(`Rejected ${successCount} memories`);
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    const toDelete = Array.from(selectedItems);
    let successCount = 0;
    for (const id of toDelete) {
      try {
        await deleteMemory(id);
        successCount++;
      } catch (e) {
        console.error('Failed to delete', id, e);
      }
    }
    toast.success(`Deleted ${successCount} memories`);
    setSelectedItems(new Set());
  };

  const startEdit = (memory: MemoryType) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await updateMemory(id, { content: editContent.trim() });
    setEditingId(null);
    setEditContent('');
  };

  const getProjectName = (projectId: string | null | undefined) => {
    if (!projectId) return 'Global';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const renderMemoryCard = (memory: MemoryType, isPending: boolean = false) => {
    const CategoryIcon = categoryIcons[memory.category || 'default'] || categoryIcons.default;
    const colorClass = categoryColors[memory.category || 'default'] || categoryColors.default;
    const isEditing = editingId === memory.id;

    return (
      <Card 
        key={memory.id} 
        className={`group transition-all ${isPending ? 'border-amber-500/30 bg-amber-500/5' : ''} ${selectedItems.has(memory.id) ? 'ring-2 ring-primary' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={selectedItems.has(memory.id)}
              onCheckedChange={(checked) => handleSelectItem(memory.id, checked as boolean)}
              className="mt-1"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={colorClass}>
                  <CategoryIcon className="h-3 w-3 me-1" />
                  {memory.category || 'general'}
                </Badge>
                {memory.is_global && (
                  <Badge variant="outline" className="text-green-400 border-green-500/30">
                    <Globe className="h-3 w-3 me-1" />
                    {t('memory.global')}
                  </Badge>
                )}
                {memory.project_id && (
                  <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                    <Folder className="h-3 w-3 me-1" />
                    {getProjectName(memory.project_id)}
                  </Badge>
                )}
                {isPending && (
                  <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                    {t('memory.pending')}
                  </Badge>
                )}
                {memory.confidence && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(memory.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={() => saveEdit(memory.id)}>
                    <Save className="h-4 w-4 text-green-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm">{memory.content}</p>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                Added {new Date(memory.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isPending ? (
                <>
                  <Button size="icon" variant="ghost" onClick={() => approveMemory(memory.id)} title={t('common.approve')}>
                    <Check className="h-4 w-4 text-green-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => rejectMemory(memory.id)} title={t('common.reject')}>
                    <XCircle className="h-4 w-4 text-red-400" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="icon" variant="ghost" onClick={() => startEdit(memory)} title={t('common.edit')}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMemory(memory.id)} title={t('common.delete')}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const stats = {
    total: memories.length,
    pending: proposedMemories.length,
    global: memories.filter(m => m.is_global).length,
    byProject: memories.filter(m => m.project_id).length,
  };

  return (
    <MainLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                {t('memory.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('memory.subtitle')}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{t('memory.total')}</p>
              </CardContent>
            </Card>
            <Card className={stats.pending > 0 ? 'border-amber-500/50' : ''}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">{t('memory.pending')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.global}</p>
                <p className="text-sm text-muted-foreground">{t('memory.global')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.byProject}</p>
                <p className="text-sm text-muted-foreground">{t('memory.projectSpecific')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('memory.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 me-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('memory.categories.all')}</SelectItem>
                    <SelectItem value="preference">{t('memory.categories.preference')}</SelectItem>
                    <SelectItem value="fact">{t('memory.categories.fact')}</SelectItem>
                    <SelectItem value="instruction">{t('memory.categories.instruction')}</SelectItem>
                    <SelectItem value="style">{t('memory.categories.style')}</SelectItem>
                  </SelectContent>
                </Select>
                {activeTab === 'project' && (
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-[180px]">
                      <Folder className="h-4 w-4 me-2" />
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('projects.allProjects')}</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.icon} {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <Card className="border-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm font-medium">{selectedItems.size} {t('memory.itemSelected')}</p>
                <div className="flex items-center gap-2">
                  {activeTab === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" onClick={handleBulkApprove}>
                        <CheckCheck className="h-4 w-4 me-1" />
                        {t('memory.approveAll')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleBulkReject}>
                        <XCircle className="h-4 w-4 me-1" />
                        {t('memory.rejectAll')}
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 me-1" />
                    {t('common.delete')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                    {t('common.clearSelection')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs and Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({memories.length})</TabsTrigger>
              <TabsTrigger value="pending" className={stats.pending > 0 ? 'text-amber-400' : ''}>
                {t('memory.pending')} ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="global">{t('memory.global')} ({stats.global})</TabsTrigger>
              <TabsTrigger value="project">{t('memory.projectSpecific')}</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === filteredMemories.length && filteredMemories.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">{t('memory.selectAll')}</span>
                </div>
                <span className="text-sm text-muted-foreground">{filteredMemories.length} memories</span>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredMemories.map(memory => renderMemoryCard(memory, false))}
                  {filteredMemories.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">{t('memory.noMemories')}</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === filteredMemories.length && filteredMemories.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">{t('memory.selectAll')}</span>
                </div>
                <span className="text-sm text-muted-foreground">{filteredMemories.length} pending</span>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredMemories.map(memory => renderMemoryCard(memory, true))}
                  {filteredMemories.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">{t('memory.noPending')}</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="global" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === filteredMemories.length && filteredMemories.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">{t('memory.selectAll')}</span>
                </div>
                <span className="text-sm text-muted-foreground">{filteredMemories.length} global memories</span>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredMemories.map(memory => renderMemoryCard(memory, false))}
                  {filteredMemories.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">{t('memory.noGlobal')}</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="project" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === filteredMemories.length && filteredMemories.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">{t('memory.selectAll')}</span>
                </div>
                <span className="text-sm text-muted-foreground">{filteredMemories.length} memories</span>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredMemories.map(memory => renderMemoryCard(memory, false))}
                  {filteredMemories.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {selectedProject === 'all' ? t('memory.selectProject') : t('memory.noProjectMemories')}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
