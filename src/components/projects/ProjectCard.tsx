import { Project } from '@/hooks/useProjects';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar, Edit, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onSelect: (project: Project) => void;
  isSelected: boolean;
}

export function ProjectCard({ project, onEdit, onDelete, onSelect, isSelected }: ProjectCardProps) {
  return (
    <Card
      className={`relative cursor-pointer transition-all hover:border-primary/50 ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}
      onClick={() => onSelect(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: `${project.color}20`, color: project.color || '#6366f1' }}
            >
              {project.icon || '💬'}
            </div>
            <div>
              <CardTitle className="text-base font-semibold leading-none mb-1">
                {project.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {project.description || 'No description'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>0 chats</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {project.dialect_preset && (
            <Badge variant="secondary" className="text-xs font-normal">
              {project.dialect_preset}
            </Badge>
          )}
          {project.default_mode && (
            <Badge variant="outline" className="text-xs font-normal">
              {project.default_mode}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex w-full justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(project)}>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(project)}>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
