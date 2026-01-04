import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { enUS, arSA } from 'date-fns/locale';
import { MessageSquare, Calendar, Archive, Trash2, Rocket, MoreVertical, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';

interface ProjectCardProps {
  project: Tables<'projects'>;
  onArchive: (project: Tables<'projects'>) => void;
  onDelete: (project: Tables<'projects'>) => void;
  onUpdate: () => void;
  onEdit?: (project: Tables<'projects'>) => void;
  onSelect?: (project: Tables<'projects'>) => void;
  onViewMemory?: (project: Tables<'projects'>) => void;
  isSelected?: boolean;
}

export function ProjectCard({ project, onArchive, onDelete, onUpdate, onEdit, onSelect, onViewMemory, isSelected }: ProjectCardProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  const isDefault = project.name === 'General'; // Simplified check

  const handleCardClick = () => {
    navigate(`/chat?project=${project.id}`);
  };

  return (
    <>
      <Card
        className="group hover:shadow-md transition-shadow cursor-pointer relative"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {project.name}
                {isDefault && <Rocket className="h-4 w-4 text-primary" />}
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-[40px]">
                {project.description || t('projects.noDescription')}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/chat?project=${project.id}`); }}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('projects.openChat')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/history?project=${project.id}`); }}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {t('projects.viewHistory')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('common.settings')}
                </DropdownMenuItem>

                {!isDefault && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(project); }}>
                      <Archive className="mr-2 h-4 w-4" />
                      {project.is_archived ? t('projects.restore') : t('common.archive')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex gap-2">
            <Badge variant={project.is_archived ? 'secondary' : 'default'}>
              {project.is_archived ? t('projects.archived') : t('projects.active')}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-0">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {t('projects.updated')} {formatDistanceToNow(new Date(project.updated_at), {
              addSuffix: true,
              locale: i18n.language === 'ar' ? arSA : enUS
            })}
          </span>
        </CardFooter>
      </Card>

      <ProjectSettingsDialog
        project={project}
        open={showSettings}
        onOpenChange={setShowSettings}
        onUpdate={onUpdate}
      />
    </>
  );
}
