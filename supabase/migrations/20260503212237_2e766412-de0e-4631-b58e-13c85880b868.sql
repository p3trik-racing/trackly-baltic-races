
ALTER TABLE public.events ALTER COLUMN organiser_id DROP NOT NULL;
ALTER TABLE public.events ADD COLUMN organiser_name TEXT;
DROP POLICY "Live events viewable by everyone" ON public.events;
CREATE POLICY "Live events viewable by everyone" ON public.events FOR SELECT USING (status = 'live' OR organiser_id = auth.uid());
