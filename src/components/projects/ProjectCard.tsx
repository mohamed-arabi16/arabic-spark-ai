import { Project } from '@/hooks/useProjects';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Calendar, Edit, Archive, Rocket, Brain, History as HistoryIcon, PlusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onSelect: (project: Project) => void;
  onViewMemory?: (project: Project) => void;
  isSelected: boolean;
}

export function ProjectCard({ project, onEdit, onDelete, onSelect, onViewMemory, isSelected }: ProjectCardProps) {
  const navigate = useNavigate();
  const isDefault = project.name === 'General'; // Assuming 'General' is the default
  const isActive = !project.is_archived; // Simplified status logic

  const handleNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/chat?project=${project.id}`);
  };

  const handleViewHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/history?project=${project.id}`); // This requires history page to handle query param
  };

  const handleViewMemory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewMemory) {
      onViewMemory(project);
    }
  };

  return (
    <Card
      className={`relative cursor-pointer transition-all hover:border-primary/50 group ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}
      onClick={() => onSelect(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg relative"
              style={{ backgroundColor: `${project.color}20`, color: project.color || '#6366f1' }}
            >
              {isDefault ? <Rocket className="h-5 w-5" /> : (project.icon || '💬')}
            </div>
            <div>
              <CardTitle className="text-base font-semibold leading-none mb-1 flex items-center gap-2">
                {project.name}
                {project.is_archived ? (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">
                    Active
                  </Badge>
                )}
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

      <CardFooter className="pt-0 h-10">
        {/* Quick Actions - Visible on Hover */}
        <div className="flex w-full justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
           <div className="flex gap-1">
             <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={handleNewChat}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Chat</TooltipContent>
             </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={handleViewHistory}>
                    <HistoryIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View History</TooltipContent>
             </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={handleViewMemory}>
                    <Brain className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Memory Summary</TooltipContent>
             </Tooltip>
           </div>

           <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(project)}
                  aria-label={`Edit ${project.name}`}
                >
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit project</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDelete(project)}
                  aria-label={project.is_archived ? `Restore ${project.name}` : `Archive ${project.name}`}
                >
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{project.is_archived ? 'Restore' : 'Archive'}</p>
              </TooltipContent>
            </Tooltip>
           </div>
        </div>
      </CardFooter>
    </Card>
  );
}
