-- Enable realtime for user_model_settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_model_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_model_settings;
  END IF;
END $$;
