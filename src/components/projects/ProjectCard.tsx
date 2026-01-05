import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { enUS, arSA } from 'date-fns/locale';
import { MessageSquare, Calendar, Archive, Trash2, Rocket, MoreVertical, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';
import { cardHover, prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

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
  const reducedMotion = prefersReducedMotion();

  const isDefault = project.name === 'General';

  const handleCardClick = () => {
    navigate(`/chat?project=${project.id}`);
  };

  const CardWrapper = reducedMotion ? 'div' : motion.div;
  const motionProps = reducedMotion ? {} : {
    variants: cardHover,
    initial: "rest",
    whileHover: "hover",
    whileTap: "tap",
  };

  return (
    <>
      <CardWrapper
        className={cn(
          "glass rounded-2xl cursor-pointer relative group",
          isSelected && "ring-2 ring-primary",
          project.is_archived && "opacity-70"
        )}
        onClick={handleCardClick}
        {...motionProps}
      >
        {/* Card Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="truncate">{project.name}</span>
                {isDefault && <Rocket className="h-4 w-4 text-primary shrink-0" />}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                {project.description || t('projects.noDescription')}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 -me-2 opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/chat?project=${project.id}`); }}>
                  <MessageSquare className="me-2 h-4 w-4" />
                  {t('projects.openChat')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/history?project=${project.id}`); }}>
                  <Calendar className="me-2 h-4 w-4" />
                  {t('projects.viewHistory')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}>
                  <Settings className="me-2 h-4 w-4" />
                  {t('common.settings')}
                </DropdownMenuItem>

                {!isDefault && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(project); }}>
                      <Archive className="me-2 h-4 w-4" />
                      {project.is_archived ? t('projects.restore') : t('common.archive')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Card Content */}
        <div className="px-6 pb-4">
          <div className="flex gap-2">
            <Badge variant={project.is_archived ? 'secondary' : 'glass'}>
              {project.is_archived ? t('projects.archived') : t('projects.active')}
            </Badge>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-6 pb-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {t('projects.updated')} {formatDistanceToNow(new Date(project.updated_at), {
              addSuffix: true,
              locale: i18n.language === 'ar' ? arSA : enUS
            })}
          </span>
        </div>
      </CardWrapper>

      <ProjectSettingsDialog
        project={project}
        open={showSettings}
        onOpenChange={setShowSettings}
        onUpdate={onUpdate}
      />
    </>
  );
}
