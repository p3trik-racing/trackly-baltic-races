-- Keep booking records (7-year tax retention) when an account is deleted
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.slot_bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.slot_bookings DROP CONSTRAINT IF EXISTS slot_bookings_user_id_fkey;
ALTER TABLE public.slot_bookings ADD CONSTRAINT slot_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.race_tickets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.race_tickets DROP CONSTRAINT IF EXISTS race_tickets_user_id_fkey;
ALTER TABLE public.race_tickets ADD CONSTRAINT race_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Profile creation also covers Google/Apple sign-ins (username derived from email prefix)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _u text;
  _base text;
  _i int := 0;
BEGIN
  _u := NULLIF(lower(new.raw_user_meta_data->>'username'), '');
  IF _u IS NULL OR EXISTS (SELECT 1 FROM public.profiles WHERE username = _u) THEN
    _base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');
    IF length(_base) < 3 THEN _base := 'driver' || _base; END IF;
    _base := left(_base, 24);
    _u := _base;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = _u) AND _i < 50 LOOP
      _u := _base || (floor(random() * 9000) + 1000)::int::text;
      _i := _i + 1;
    END LOOP;
  END IF;
  INSERT INTO public.profiles (id, email, full_name, phone, username, lang)
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    _u,
    CASE WHEN new.raw_user_meta_data->>'lang' IN ('en','ru','lv') THEN new.raw_user_meta_data->>'lang' ELSE NULL END
  );
  RETURN new;
END;
$function$;