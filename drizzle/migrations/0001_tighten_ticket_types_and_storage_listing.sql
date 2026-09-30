DROP POLICY IF EXISTS "rtt read" ON public.race_ticket_types;
CREATE POLICY "rtt read" ON public.race_ticket_types FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = competition_id AND c.status = 'live')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.race_tickets r WHERE r.ticket_type_id = id AND r.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Event covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;