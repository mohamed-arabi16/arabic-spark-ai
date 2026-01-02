import { Project } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Manage the general configuration for {project.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
             <Label>Project ID</Label>
             <div className="flex gap-2">
               <Input value={project.id} readOnly className="font-mono text-xs bg-muted" />
               <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(project.id)}>
                 Copy
               </Button>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-destructive/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-destructive">Archive Project</h4>
                <p className="text-sm text-muted-foreground">
                  Archiving this project will hide it from your workspace list.
                </p>
              </div>
              <Button variant="destructive">Archive</Button>
            </div>
            <Separator className="my-4" />
             <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-destructive">Delete Project</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this project and all its conversations. This cannot be undone.
                </p>
              </div>
              <Button variant="destructive">Delete Permanently</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
