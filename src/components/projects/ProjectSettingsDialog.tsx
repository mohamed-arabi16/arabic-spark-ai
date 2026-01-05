import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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

  // Core settings
  const [defaultMode, setDefaultMode] = useState<string>(project.default_mode || 'fast');
  const [dialectPreset, setDialectPreset] = useState<string>(project.dialect_preset || 'msa');
  const [systemInstructions, setSystemInstructions] = useState(project.system_instructions || '');
  
  // Extended Arabic settings - using type assertion for new columns
  const projectAny = project as any;
  const [formality, setFormality] = useState<string>(projectAny.dialect_formality || 'casual');
  const [codeSwitchMode, setCodeSwitchMode] = useState<string>(projectAny.code_switch_mode || 'mixed');
  const [numeralMode, setNumeralMode] = useState<string>(projectAny.numeral_mode || 'western');

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          default_mode: defaultMode as any,
          dialect_preset: dialectPreset as any,
          system_instructions: systemInstructions,
          dialect_formality: formality,
          code_switch_mode: codeSwitchMode,
          numeral_mode: numeralMode,
        } as any)
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
                <SelectItem value="msa">Modern Standard Arabic (الفصحى)</SelectItem>
                <SelectItem value="egyptian">Egyptian (مصري)</SelectItem>
                <SelectItem value="gulf">Gulf (خليجي)</SelectItem>
                <SelectItem value="levantine">Levantine (شامي)</SelectItem>
                <SelectItem value="maghrebi">Maghrebi (مغاربي)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-2" />
          <p className="text-sm font-medium text-muted-foreground">{t('arabic.dialectSettings')}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t('arabic.formality')}</Label>
              <Select value={formality} onValueChange={setFormality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">{t('arabic.formal')}</SelectItem>
                  <SelectItem value="casual">{t('arabic.casual')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('arabic.numeralMode')}</Label>
              <Select value={numeralMode} onValueChange={setNumeralMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="western">{t('arabic.westernNumerals')}</SelectItem>
                  <SelectItem value="arabic">{t('arabic.arabicNumerals')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t('arabic.codeSwitch')}</Label>
            <Select value={codeSwitchMode} onValueChange={setCodeSwitchMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arabic_only">{t('arabic.arabicOnly')}</SelectItem>
                <SelectItem value="mixed">{t('arabic.mixedAllowed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-2" />

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
