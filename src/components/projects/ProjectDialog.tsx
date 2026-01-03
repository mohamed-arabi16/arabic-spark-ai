import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Project, ProjectInsert, ProjectUpdate } from '@/hooks/useProjects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Constants } from '@/integrations/supabase/types';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const dialectOptions = [...Constants.public.Enums.dialect_preset] as [string, ...string[]];
const modeOptions = [...Constants.public.Enums.chat_mode] as [string, ...string[]];

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  system_instructions: z.string().optional(),
  dialect_preset: z.enum(dialectOptions).optional(),
  default_mode: z.enum(modeOptions).optional(),
});

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSubmit: (data: ProjectInsert | ProjectUpdate) => Promise<void>;
}

export function ProjectDialog({ open, onOpenChange, project, onSubmit }: ProjectDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '💬',
      color: '#6366f1',
      system_instructions: '',
      dialect_preset: 'msa',
      default_mode: 'fast',
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        icon: project.icon || '💬',
        color: project.color || '#6366f1',
        system_instructions: project.system_instructions || '',
        dialect_preset: project.dialect_preset || 'msa',
        default_mode: project.default_mode || 'fast',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        icon: '💬',
        color: '#6366f1',
        system_instructions: '',
        dialect_preset: 'msa',
        default_mode: 'fast',
      });
    }
  }, [project, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values as unknown as ProjectInsert);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? t('projects.dialog.editTitle') : t('projects.dialog.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('projects.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t('projects.dialog.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('projects.dialog.namePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.dialog.iconLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder="💬" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.dialog.colorLabel')}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1" {...field} />
                        <Input {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialog.descLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('projects.dialog.descPlaceholder')}
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dialect_preset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.dialog.dialectLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Constants.public.Enums.dialect_preset.map((preset) => (
                          <SelectItem key={preset} value={preset}>
                            {preset.charAt(0).toUpperCase() + preset.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.dialog.modeLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Constants.public.Enums.chat_mode.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="system_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialog.instructionsLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('projects.dialog.instructionsDesc')}
                      className="resize-y h-32 font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('projects.dialog.instructionsDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('projects.dialog.saving') : project ? t('common.saveChanges') : t('projects.newProject')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
