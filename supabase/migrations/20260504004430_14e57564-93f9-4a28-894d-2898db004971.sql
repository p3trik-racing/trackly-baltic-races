
-- Ensure buckets are public
UPDATE storage.buckets SET public = true WHERE id IN ('avatars', 'event-covers');

-- Drop existing related policies if any
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Event covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own event covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event covers" ON storage.objects;

-- Avatars
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

-- Event covers
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
