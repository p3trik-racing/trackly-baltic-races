-- Ensure storage buckets exist with correct config
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-covers', 'event-covers', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Recreate storage RLS policies
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Event covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own event covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event covers" ON storage.objects;

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Event covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-covers');

CREATE POLICY "Authenticated users can upload event covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own event covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own event covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);