import { Memory } from '@/hooks/useMemory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
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
import { prefersReducedMotion, cardHover, staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, any> = {
  preference: Heart,
  fact: User,
  instruction: Settings,
  style: Lightbulb,
  default: Brain,
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
  const reducedMotion = prefersReducedMotion();
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

  const MotionDiv = reducedMotion ? 'div' : motion.div;

  const renderMemoryCard = (memory: Memory, index: number) => {
    const CategoryIcon = categoryIcons[memory.category || 'default'] || categoryIcons.default;
    const isEditing = editingId === memory.id;
    const isSelected = selectedItems?.has(memory.id) || false;

    return (
      <MotionDiv
        key={memory.id}
        className={cn(
          "glass rounded-2xl p-5 group transition-all",
          isPending && "border-amber-500/30 bg-amber-500/5",
          isSelected && "ring-2 ring-primary"
        )}
        {...(reducedMotion ? {} : { 
          variants: staggerItem,
          whileHover: { scale: 1.01 },
          transition: { duration: 0.2 }
        })}
      >
        <div className="flex items-start gap-3">
          {onSelectionChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(memory.id, checked as boolean)}
              className="mt-1"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="glass" className="gap-1">
                <CategoryIcon className="h-3 w-3" />
                {t(`memory.categories.${memory.category || 'fact'}`)}
              </Badge>
              {memory.is_global && (
                <Badge variant="glass" className="text-emerald-400 border-emerald-500/30 gap-1">
                  <Globe className="h-3 w-3" />
                  {t('memory.global')}
                </Badge>
              )}
              {memory.project_id && (
                <Badge variant="glass" className="text-blue-400 border-blue-500/30 gap-1">
                  <Folder className="h-3 w-3" />
                  {getProjectName(memory.project_id)}
                </Badge>
              )}
              {isPending && (
                <Badge variant="glass" className="text-amber-400 border-amber-500/30">
                  {t('memory.pending')}
                </Badge>
              )}
              {memory.confidence && (
                <span className="text-xs text-muted-foreground">
                  <LTR>{Math.round(memory.confidence * 100)}%</LTR> {t('memory.confidence')}
                </span>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={() => saveEdit(memory.id)}>
                  <Save className="h-4 w-4 text-emerald-400" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{memory.content}</p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
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

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isPending ? (
              <>
                {onApprove && (
                  <Button size="icon" variant="ghost" onClick={() => onApprove(memory.id)} title={t('common.approve')}>
                    <Check className="h-4 w-4 text-emerald-400" />
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
      </MotionDiv>
    );
  };

  if (memories.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        {isPending ? t('memory.noPending') : t('memory.noMemories')}
      </div>
    );
  }

  return (
    <MotionDiv
      className="space-y-4"
      {...(reducedMotion ? {} : { variants: staggerContainer, initial: "hidden", animate: "visible" })}
    >
      {memories.map((memory, index) => renderMemoryCard(memory, index))}
    </MotionDiv>
  );
}
