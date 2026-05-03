-- Add profile preference fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favourite_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS event_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_confirmations boolean NOT NULL DEFAULT true;

-- Storage buckets for avatars and event covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, users upload to their own folder
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Event covers: public read, organisers upload to their own folder
CREATE POLICY "Event covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-covers');

CREATE POLICY "Organisers upload event covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Organisers update event covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Organisers delete event covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
