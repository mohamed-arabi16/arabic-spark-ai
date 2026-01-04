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

  // Use existing columns directly
  const [defaultMode, setDefaultMode] = useState<string>(project.default_mode || 'fast');
  const [dialectPreset, setDialectPreset] = useState<string>(project.dialect_preset || 'msa');
  const [systemInstructions, setSystemInstructions] = useState(project.system_instructions || '');

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          default_mode: defaultMode as any,
          dialect_preset: dialectPreset as any,
          system_instructions: systemInstructions,
        })
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
            <Label>{t('settings.defaultMode')}</Label>
            <Select value={defaultMode} onValueChange={setDefaultMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deep">Deep</SelectItem>
                <SelectItem value="research">Research</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('settings.dialect')}</Label>
            <Select value={dialectPreset} onValueChange={setDialectPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="msa">Modern Standard Arabic (MSA)</SelectItem>
                <SelectItem value="egyptian">Egyptian</SelectItem>
                <SelectItem value="gulf">Gulf</SelectItem>
                <SelectItem value="levantine">Levantine</SelectItem>
                <SelectItem value="maghrebi">Maghrebi</SelectItem>
              </SelectContent>
            </Select>
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
