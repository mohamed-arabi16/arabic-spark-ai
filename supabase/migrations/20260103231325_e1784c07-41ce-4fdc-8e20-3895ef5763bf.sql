-- Make project_id nullable in conversations table to allow research without a project
ALTER TABLE public.conversations ALTER COLUMN project_id DROP NOT NULL;