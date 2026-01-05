-- Phase 5: Arabic Quality Layer, Metrics, and Feedback

-- 1. Project dialect settings - add formality, code-switch, numeral columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dialect_formality TEXT DEFAULT 'casual';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS code_switch_mode TEXT DEFAULT 'mixed';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS numeral_mode TEXT DEFAULT 'western';

-- 2. Message feedback for evaluation
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL, -- 'positive', 'negative', 'fluency_issue', 'reask'
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback" ON message_feedback
  FOR ALL USING (auth.uid() = user_id);

-- 3. Index for efficient feedback queries
CREATE INDEX IF NOT EXISTS idx_message_feedback_user ON message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_type ON message_feedback(feedback_type);

-- 4. User dialect preferences in profiles (add if missing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_numeral_mode TEXT DEFAULT 'western';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_formality TEXT DEFAULT 'casual';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS code_switch_mode TEXT DEFAULT 'mixed';