-- Add is_default flag to identify the General project
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create index for faster lookup of default project
CREATE INDEX IF NOT EXISTS idx_projects_is_default ON projects(user_id, is_default) WHERE is_default = true;