
-- 1. Tighten bookings INSERT policy: prevent users from setting status, financial, or Stripe fields
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
CREATE POLICY "Users can create own bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND stripe_payment_intent_id IS NULL
  AND stripe_refund_id IS NULL
);

-- 2. Revoke column-level SELECT on Stripe identifier columns from authenticated and anon
REVOKE SELECT (stripe_payment_intent_id, stripe_refund_id) ON public.bookings FROM authenticated;
REVOKE SELECT (stripe_payment_intent_id, stripe_refund_id) ON public.bookings FROM anon;
REVOKE INSERT (stripe_payment_intent_id, stripe_refund_id) ON public.bookings FROM authenticated;
REVOKE INSERT (stripe_payment_intent_id, stripe_refund_id) ON public.bookings FROM anon;
REVOKE UPDATE (stripe_payment_intent_id, stripe_refund_id) ON public.bookings FROM authenticated;
REVOKE UPDATE (stripe_payment_intent_id, stripe_refund_id) ON public.bookings FROM anon;

-- 3. Notifications: remove client-side INSERT policy; only service_role (edge functions) creates notifications
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

-- 4. Profiles UPDATE policy: explicitly scope to authenticated role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
