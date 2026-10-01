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
    CASE WHEN new.raw_user_meta_data->>'lang' IN ('en','ru','lv') THEN new.raw_user_meta_data->>'lang' ELSE 'en' END
  );
  RETURN new;
END;
$function$;