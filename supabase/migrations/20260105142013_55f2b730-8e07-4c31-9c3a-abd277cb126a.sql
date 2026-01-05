-- Phase 4: Memory System Enhancements

-- 1. Memory Audit Log table for compliance tracking
CREATE TABLE IF NOT EXISTS memory_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_id UUID,
  action TEXT NOT NULL, -- 'created', 'approved', 'rejected', 'updated', 'deleted', 'exported'
  old_content TEXT,
  new_content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE memory_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit log" ON memory_audit_log 
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own audit entries
CREATE POLICY "Users can insert own audit entries" ON memory_audit_log 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Add last_used_at to memory_objects for retrieval ranking
ALTER TABLE memory_objects ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- 3. Create index for efficient memory retrieval
CREATE INDEX IF NOT EXISTS idx_memory_objects_status_active 
  ON memory_objects(user_id, status, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_memory_objects_project 
  ON memory_objects(project_id, status, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_memory_audit_log_user 
  ON memory_audit_log(user_id, created_at DESC);