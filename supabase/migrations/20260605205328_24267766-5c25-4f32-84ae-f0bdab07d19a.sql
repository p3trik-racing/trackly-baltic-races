
-- 1. Drop overly permissive UPDATE policy (all writes go via service-role edge functions)
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

-- 2. Restrict SELECT on bookings to the owning user only
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Organiser-facing view that excludes Stripe identifiers and enforces ownership
CREATE OR REPLACE VIEW public.organiser_bookings
WITH (security_invoker = false)
AS
SELECT
  b.id,
  b.event_id,
  b.user_id,
  b.attendee_name,
  b.attendee_email,
  b.attendee_phone,
  b.ticket_count,
  b.total_price,
  b.organiser_payout,
  b.platform_fee,
  b.status,
  b.waiver_accepted,
  b.created_at
FROM public.bookings b
JOIN public.events e ON e.id = b.event_id
WHERE e.organiser_id = auth.uid();

REVOKE ALL ON public.organiser_bookings FROM PUBLIC, anon;
GRANT SELECT ON public.organiser_bookings TO authenticated;

-- 4. Lock down trigger-only SECURITY DEFINER functions from API roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_username() FROM PUBLIC, anon, authenticated;
