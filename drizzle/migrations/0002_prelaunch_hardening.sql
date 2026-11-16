CREATE TABLE public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  livemode boolean NOT NULL,
  account text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_dispute_id text, ADD COLUMN IF NOT EXISTS disputed_at timestamptz;
ALTER TABLE public.slot_bookings ADD COLUMN IF NOT EXISTS stripe_dispute_id text, ADD COLUMN IF NOT EXISTS disputed_at timestamptz;
ALTER TABLE public.race_tickets ADD COLUMN IF NOT EXISTS stripe_dispute_id text, ADD COLUMN IF NOT EXISTS disputed_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_flags()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.is_organiser := OLD.is_organiser;
    NEW.blocked := OLD.blocked;
    NEW.blocked_reason := OLD.blocked_reason;
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_charges_enabled := OLD.stripe_charges_enabled;
    NEW.stripe_payouts_enabled := OLD.stripe_payouts_enabled;
    NEW.stripe_details_submitted := OLD.stripe_details_submitted;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.get_event_booked_counts(event_ids uuid[])
RETURNS TABLE(event_id uuid, confirmed integer, held integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.event_id,
    COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN COALESCE(b.ticket_count,1) ELSE 0 END),0)::int,
    COALESCE(SUM(CASE WHEN b.status NOT IN ('confirmed','cancelled') THEN COALESCE(b.ticket_count,1) ELSE 0 END),0)::int
  FROM public.bookings b
  WHERE b.event_id = ANY(event_ids) AND cardinality(event_ids) <= 500
  GROUP BY b.event_id
$$;
REVOKE ALL ON FUNCTION public.get_event_booked_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_booked_counts(uuid[]) TO anon, authenticated, service_role;

CREATE TABLE public.organiser_tax_details (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_type text NOT NULL CHECK (seller_type IN ('individual','company')),
  legal_name text NOT NULL CHECK (char_length(legal_name) BETWEEN 1 AND 200),
  address_line text NOT NULL CHECK (char_length(address_line) BETWEEN 1 AND 300),
  city text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 100),
  postcode text NOT NULL CHECK (char_length(postcode) BETWEEN 1 AND 20),
  country text NOT NULL DEFAULT 'LV' CHECK (country ~ '^[A-Z]{2}$'),
  tax_id_or_reg_no text NOT NULL CHECK (char_length(tax_id_or_reg_no) BETWEEN 1 AND 50),
  vat_no text CHECK (vat_no IS NULL OR char_length(vat_no) <= 30),
  iban text NOT NULL CHECK (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  date_of_birth date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (seller_type = 'individual' OR date_of_birth IS NULL)
);
GRANT SELECT, INSERT, UPDATE ON public.organiser_tax_details TO authenticated;
GRANT ALL ON public.organiser_tax_details TO service_role;
ALTER TABLE public.organiser_tax_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own tax details" ON public.organiser_tax_details FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner inserts own tax details" ON public.organiser_tax_details FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner updates own tax details" ON public.organiser_tax_details FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_organiser_tax_details()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER organiser_tax_details_touch BEFORE INSERT OR UPDATE ON public.organiser_tax_details
  FOR EACH ROW EXECUTE FUNCTION public.touch_organiser_tax_details();

CREATE OR REPLACE FUNCTION public.organiser_tax_complete(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organiser_tax_details d WHERE d.user_id = _user_id
    AND d.legal_name <> '' AND d.address_line <> '' AND d.city <> '' AND d.postcode <> ''
    AND d.tax_id_or_reg_no <> '' AND d.iban <> '')
$$;
REVOKE ALL ON FUNCTION public.organiser_tax_complete(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organiser_tax_complete(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.require_seller_details_to_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'live' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'live')
     AND auth.uid() IS NOT NULL
     AND NEW.organiser_id IS NOT NULL
     AND NOT public.has_role(NEW.organiser_id, 'admin')
     AND NOT public.organiser_tax_complete(NEW.organiser_id) THEN
    RAISE EXCEPTION 'SELLER_DETAILS_REQUIRED: Complete your seller details before publishing.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER events_require_seller_details BEFORE INSERT OR UPDATE OF status ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.require_seller_details_to_publish();

CREATE OR REPLACE FUNCTION public.get_event_seller_name(_event_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(d.legal_name,''), NULLIF(e.organiser_name,''), NULLIF(p.full_name,''))
  FROM public.events e
  LEFT JOIN public.organiser_tax_details d ON d.user_id = e.organiser_id
  LEFT JOIN public.profiles p ON p.id = e.organiser_id
  WHERE e.id = _event_id
$$;
GRANT EXECUTE ON FUNCTION public.get_event_seller_name(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_venue_seller_name(_venue_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(d.legal_name,''), NULLIF(p.full_name,''), v.name)
  FROM public.venues v
  LEFT JOIN public.organiser_tax_details d ON d.user_id = v.owner_id
  LEFT JOIN public.profiles p ON p.id = v.owner_id
  WHERE v.id = _venue_id
$$;
GRANT EXECUTE ON FUNCTION public.get_venue_seller_name(uuid) TO anon, authenticated, service_role;