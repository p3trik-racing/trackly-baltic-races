
-- Drop the temporary view
DROP VIEW IF EXISTS public.organiser_bookings;

-- Restore organiser visibility on bookings (column-level grant below will hide stripe IDs)
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users and organisers can view bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT organiser_id FROM public.events WHERE id = bookings.event_id
    )
  );

-- Column-level protection: revoke broad SELECT and re-grant non-sensitive columns
REVOKE SELECT ON public.bookings FROM authenticated, anon;
GRANT SELECT
  (id, event_id, user_id, attendee_name, attendee_email, attendee_phone,
   ticket_count, total_price, organiser_payout, platform_fee,
   status, waiver_accepted, created_at)
  ON public.bookings TO authenticated;
-- service_role keeps ALL (already granted) for edge functions
GRANT ALL ON public.bookings TO service_role;
