import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X, Edit2, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface MemoryCaptureToastProps {
  content: string;
  onApprove: (content: string) => void;
  onEdit: (content: string) => void;
  onDismiss?: () => void;
  onClose: () => void;
}

export function MemoryCaptureToast({
  content,
  onApprove,
  onEdit,
  onDismiss,
  onClose
}: MemoryCaptureToastProps) {
  const { t } = useTranslation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  // We'll use a custom toast via sonner
  useEffect(() => {
    const toastId = toast.custom((id) => (
      <Card className="w-full max-w-md p-4 shadow-lg border-l-4 border-l-primary flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Brain className="h-4 w-4" />
            <span>{t('memory.suggestion', 'Memory Suggestion')}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
              toast.dismiss(id);
              if (onDismiss) onDismiss();
              onClose();
          }}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
          "{content}"
        </p>

        <div className="flex items-center gap-2 mt-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit2 className="h-3 w-3 me-1" />
            {t('common.edit', 'Edit')}
          </Button>
          <Button size="sm" onClick={() => {
            onApprove(content);
            toast.dismiss(id);
          }}>
            <Check className="h-3 w-3 me-1" />
            {t('common.approve', 'Approve')}
          </Button>
        </div>
      </Card>
    ), {
        duration: Infinity, // User must interact
        position: 'bottom-right'
    });

    return () => {
        toast.dismiss(toastId);
    };
  }, [content, onApprove, onEdit, onDismiss, onClose, t]);

  const handleSaveEdit = () => {
    onEdit(editedContent);
    setIsEditOpen(false);
    onClose(); // Close the toast context too as we handled it
  };

  if (isEditOpen) {
    return (
        <Dialog open={isEditOpen} onOpenChange={(open) => {
            if (!open) {
                setIsEditOpen(false);
                // Don't close the toast if just cancelling edit?
                // Actually if we cancel edit, we probably want to go back to toast.
                // But simplified: keep toast logic separate.
            }
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('memory.editSuggestion', 'Edit Memory Suggestion')}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleSaveEdit}>{t('common.save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
  }

  return null; // The toast is rendered via useEffect
}
