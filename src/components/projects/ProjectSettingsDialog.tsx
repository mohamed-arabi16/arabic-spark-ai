import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectSettingsDialogProps {
  project: Tables<'projects'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ProjectSettingsDialog({ project, open, onOpenChange, onUpdate }: ProjectSettingsDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Parse existing settings or use defaults
  const settings = project.settings as any || {};
  const [model, setModel] = useState(settings.model || 'gpt-5.2');
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memory_enabled !== false);
  const [systemInstructions, setSystemInstructions] = useState(settings.system_instructions || '');

  const handleSave = async () => {
    setLoading(true);
    try {
      const newSettings = {
        ...settings,
        model,
        memory_enabled: memoryEnabled,
        system_instructions: systemInstructions
      };

      const { error } = await supabase
        .from('projects')
        .update({ settings: newSettings })
        .eq('id', project.id);

      if (error) throw error;

      toast.success(t('settings.saved'));
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving project settings:', error);
      toast.error(t('errors.updateProject'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('projects.dialog.editTitle')}</DialogTitle>
          <DialogDescription>
            {t('projects.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t('settings.model')}</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5.2">GPT-5.2 (Standard)</SelectItem>
                <SelectItem value="gpt-4">GPT-4 (Legacy)</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('settings.enableMemory')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.enableMemoryDesc')}
              </p>
            </div>
            <Switch
              checked={memoryEnabled}
              onCheckedChange={setMemoryEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('projects.dialog.instructionsLabel')}</Label>
            <Textarea
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              placeholder={t('projects.dialog.instructionsDesc')}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? t('projects.dialog.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
