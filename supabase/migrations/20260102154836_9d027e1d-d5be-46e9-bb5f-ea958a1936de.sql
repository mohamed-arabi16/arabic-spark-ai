-- Add conversation_summaries table
CREATE TABLE public.conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  summary text NOT NULL,
  last_summarized_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on conversation_summaries
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_summaries
CREATE POLICY "Users can view own summaries"
  ON public.conversation_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own summaries"
  ON public.conversation_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON public.conversation_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON public.conversation_summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_conversation_summaries_updated_at
  BEFORE UPDATE ON public.conversation_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enhance memory_objects with new columns for better memory tracking
ALTER TABLE public.memory_objects 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'fact',
ADD COLUMN IF NOT EXISTS key text,
ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS source_conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_message_ids uuid[] DEFAULT '{}';

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON public.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_memory_user_status ON public.memory_objects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_memory_project ON public.memory_objects(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conversation ON public.conversation_summaries(conversation_id);

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;