import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  system_instructions: z.string().optional(),
  dialect_preset: z.enum(Constants.public.Enums.dialect_preset as [string, ...string[]]).optional(),
  default_mode: z.enum(Constants.public.Enums.chat_mode as [string, ...string[]]).optional(),
});

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSubmit: (data: ProjectInsert | ProjectUpdate) => Promise<void>;
}

export function ProjectDialog({ open, onOpenChange, project, onSubmit }: ProjectDialogProps) {
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
      // Cast values to compatible types because zod enum inference can be tricky with specific string literals vs general strings
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
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription>
            Configure your workspace settings and defaults.
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
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Project" {...field} />
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
                    <FormLabel>Icon (Emoji)</FormLabel>
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
                    <FormLabel>Color</FormLabel>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What is this project about?"
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
                    <FormLabel>Default Dialect</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dialect" />
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
                    <FormLabel>Default Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
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
                  <FormLabel>System Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Custom instructions for the AI in this project..."
                      className="resize-y h-32 font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These instructions will be prepended to every conversation in this project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
