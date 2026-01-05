import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Memory, MemoryUpdate } from '@/hooks/useMemory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Edit2, Save, X, Plus, Check, XCircle, Brain, Sparkles, Globe, FolderOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate, LTR } from '@/lib/bidi';

interface MemoryManagerProps {
  memories: Memory[];
  proposedMemories?: Memory[];
  onAdd: (content: string, category: string, isGlobal: boolean) => Promise<any>;
  onUpdate: (id: string, updates: MemoryUpdate) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  projectId?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  fact: <Brain className="h-3 w-3" />,
  preference: <Sparkles className="h-3 w-3" />,
  instruction: <FolderOpen className="h-3 w-3" />,
  constraint: <XCircle className="h-3 w-3" />,
  identity: <Globe className="h-3 w-3" />,
};

const categoryColors: Record<string, string> = {
  fact: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preference: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  instruction: 'bg-green-500/10 text-green-600 border-green-500/20',
  constraint: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  identity: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

export function MemoryManager({ 
  memories, 
  proposedMemories = [],
  onAdd, 
  onUpdate, 
  onDelete,
  onApprove,
  onReject,
  projectId 
}: MemoryManagerProps) {
  const { t, i18n } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('fact');
  const [isGlobal, setIsGlobal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [activeTab, setActiveTab] = useState('approved');

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    await onAdd(newContent, newCategory, isGlobal);
    setNewContent('');
    setIsAdding(false);
  };

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await onUpdate(id, { content: editContent });
    setEditingId(null);
  };

  const renderMemoryCard = (memory: Memory, isProposed = false) => (
    <div 
      key={memory.id} 
      className={`p-3 border rounded-lg group transition-all ${
        isProposed 
          ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' 
          : 'hover:bg-muted/30'
      }`}
    >
      {editingId === memory.id ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px]"
              dir="auto"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => saveEdit(memory.id)}>
                <Save className="h-4 w-4 me-1" /> {t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 space-y-2">
              {(memory as any).key && (
                <p className="text-xs font-medium text-muted-foreground">
                  {(memory as any).key}
                </p>
              )}
              <p className="text-sm">{memory.content}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge 
                  variant="outline" 
                  className={`text-[10px] h-5 ${categoryColors[memory.category || 'fact'] || ''}`}
                >
                  {categoryIcons[memory.category || 'fact']}
                  <span className="ms-1">{t(`memory.categories.${memory.category || 'fact'}`)}</span>
                </Badge>
                {memory.is_global && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    <Globe className="h-2.5 w-2.5 me-1" /> {t('memory.global')}
                  </Badge>
                )}
                {(memory as any).confidence && (
                  <span className="text-[10px] text-muted-foreground">
                    <LTR>{Math.round((memory as any).confidence * 100)}%</LTR> {t('memory.confidence')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              {isProposed && onApprove && onReject ? (
                  <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10" 
                        onClick={() => onApprove(memory.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('memory.approveTooltip')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-500/10" 
                        onClick={() => onReject(memory.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('memory.rejectTooltip')}</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(memory)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive" 
                    onClick={() => onDelete(memory.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="h-full flex flex-col" dir={i18n.dir()}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {t('memory.title')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {isAdding && (
          <div className="p-3 border rounded-lg bg-muted/50 space-y-3 mb-4">
            <Textarea
              placeholder={t('memory.addPlaceholder')}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[80px]"
              autoFocus
              dir="auto"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fact">{t('memory.categories.fact')}</SelectItem>
                  <SelectItem value="preference">{t('memory.categories.preference')}</SelectItem>
                  <SelectItem value="instruction">{t('memory.categories.instruction')}</SelectItem>
                  <SelectItem value="constraint">{t('memory.categories.constraint')}</SelectItem>
                  <SelectItem value="identity">{t('memory.categories.identity')}</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                variant={isGlobal ? "default" : "outline"} 
                onClick={() => setIsGlobal(!isGlobal)}
                className="h-8"
              >
                <Globe className="h-3 w-3 me-1" />
                {isGlobal ? t('memory.global') : t('memory.projectOnly')}
              </Button>
              <div className="flex-1" />
              <Button size="sm" onClick={handleAdd}>
                <Save className="h-3 w-3 me-1" /> {t('common.save')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="approved" className="text-xs">
              {t('memory.approved')} ({memories.length})
            </TabsTrigger>
            <TabsTrigger value="proposed" className="text-xs relative">
              {t('memory.pending')} ({proposedMemories.length})
              {proposedMemories.length > 0 && (
                <span className="absolute -top-1 -end-1 h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approved" className="flex-1 overflow-y-auto space-y-2 mt-0">
            {memories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('memory.noApprovedMemories')}
              </p>
            ) : (
              memories.map((memory) => renderMemoryCard(memory, false))
            )}
          </TabsContent>

          <TabsContent value="proposed" className="flex-1 overflow-y-auto space-y-2 mt-0">
            {proposedMemories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('memory.noPendingMemoriesDesc')}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('memory.pendingExplanation')}
                </p>
                {proposedMemories.map((memory) => renderMemoryCard(memory, true))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
