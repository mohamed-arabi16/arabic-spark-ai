import { Memory } from '@/hooks/useMemory';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Brain,
  Trash2,
  Check,
  XCircle,
  Edit2,
  Save,
  X,
  Globe,
  Folder,
  Heart,
  User,
  Settings,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { formatDate, LTR } from '@/lib/bidi';
import { Link } from 'react-router-dom';

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

interface MemoryListProps {
  memories: Memory[];
  isPending?: boolean;
  selectedItems?: Set<string>;
  onSelectionChange?: (id: string, checked: boolean) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, content: string) => Promise<void>;
  getProjectName?: (id: string | null | undefined) => string;
}

export function MemoryList({
  memories,
  isPending = false,
  selectedItems,
  onSelectionChange,
  onApprove,
  onReject,
  onDelete,
  onUpdate,
  getProjectName = (id) => id ? 'Project' : 'Global'
}: MemoryListProps) {
  const { t, i18n } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    if (onUpdate) {
        await onUpdate(id, editContent.trim());
    }
    setEditingId(null);
    setEditContent('');
  };

  const renderMemoryCard = (memory: Memory) => {
    const CategoryIcon = categoryIcons[memory.category || 'default'] || categoryIcons.default;
    const colorClass = categoryColors[memory.category || 'default'] || categoryColors.default;
    const isEditing = editingId === memory.id;
    const isSelected = selectedItems?.has(memory.id) || false;

    return (
      <Card
        key={memory.id}
        className={`group transition-all ${isPending ? 'border-amber-500/30 bg-amber-500/5' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {onSelectionChange && (
                <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectionChange(memory.id, checked as boolean)}
                className="mt-1"
                />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={colorClass}>
                  <CategoryIcon className="h-3 w-3 me-1" />
                  {t(`memory.categories.${memory.category || 'fact'}`)}
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
                    <LTR>{Math.round(memory.confidence * 100)}%</LTR> {t('memory.confidence')}
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

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  {t('memory.added')} <LTR>{formatDate(memory.created_at, i18n.language)}</LTR>
                </span>
                {memory.last_used_at && (
                  <span>
                    {t('memory.lastUsed')} <LTR>{formatDate(memory.last_used_at, i18n.language)}</LTR>
                  </span>
                )}
                {memory.source_conversation_id && (
                  <Link 
                    to={`/chat?conversationId=${memory.source_conversation_id}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('memory.viewSource')}
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isPending ? (
                <>
                  {onApprove && (
                      <Button size="icon" variant="ghost" onClick={() => onApprove(memory.id)} title={t('common.approve')}>
                        <Check className="h-4 w-4 text-green-400" />
                      </Button>
                  )}
                  {onReject && (
                      <Button size="icon" variant="ghost" onClick={() => onReject(memory.id)} title={t('common.reject')}>
                        <XCircle className="h-4 w-4 text-red-400" />
                      </Button>
                  )}
                </>
              ) : (
                <>
                  {onUpdate && (
                      <Button size="icon" variant="ghost" onClick={() => startEdit(memory)} title={t('common.edit')}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                  )}
                  {onDelete && (
                      <Button size="icon" variant="ghost" onClick={() => onDelete(memory.id)} title={t('common.delete')}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (memories.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
            {isPending ? t('memory.noPending') : t('memory.noMemories')}
        </div>
      );
  }

  return (
    <div className="space-y-3">
        {memories.map(memory => renderMemoryCard(memory))}
    </div>
  );
}
