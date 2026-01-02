-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('generated-images', 'generated-images', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for generated-images bucket
CREATE POLICY "Users can view all generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);