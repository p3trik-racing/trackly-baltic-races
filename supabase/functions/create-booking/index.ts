// Server-authoritative booking creation.
// Computes financial fields server-side, verifies Stripe payment when applicable,
// and inserts the booking + notifications using the service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const {
      event_id,
      attendee_name,
      attendee_email,
      attendee_phone,
      ticket_count,
      waiver_accepted,
      stripe_payment_intent_id,
    } = body ?? {};

    if (!event_id || typeof event_id !== "string") return json({ error: "Missing event_id" }, 400);
    if (!attendee_name || typeof attendee_name !== "string") return json({ error: "Missing name" }, 400);
    if (!attendee_email || typeof attendee_email !== "string") return json({ error: "Missing email" }, 400);
    const tc = Number(ticket_count);
    if (!Number.isInteger(tc) || tc < 1 || tc > 20) return json({ error: "Invalid ticket count" }, 400);
    if (waiver_accepted !== true) return json({ error: "Waiver must be accepted" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch event server-side to get authoritative price
    const { data: event, error: evErr } = await admin
      .from("events")
      .select("id,title,price,currency,status,capacity,organiser_id")
      .eq("id", event_id)
      .maybeSingle();
    if (evErr || !event) return json({ error: "Event not found" }, 404);
    if (event.status !== "live") return json({ error: "Event not available" }, 400);

    // Capacity check
    if (event.capacity && event.capacity > 0) {
      const { data: existing } = await admin
        .from("bookings")
        .select("ticket_count,status")
        .eq("event_id", event_id);
      const booked = (existing ?? [])
        .filter((b: any) => b.status !== "cancelled")
        .reduce((s: number, b: any) => s + (b.ticket_count ?? 1), 0);
      if (booked + tc > event.capacity) return json({ error: "Not enough spots available" }, 400);
    }

    const price = Number(event.price) || 0;
    const isFree = price === 0;
    const subtotal = +(price * tc).toFixed(2);
    const platform_fee = isFree ? 0 : +(subtotal * 0.05).toFixed(2);
    const total_price = isFree ? 0 : +(subtotal + platform_fee).toFixed(2);
    const organiser_payout = isFree ? 0 : subtotal;

    let verifiedIntentId: string | null = null;
    if (!isFree) {
      if (!stripe_payment_intent_id || typeof stripe_payment_intent_id !== "string") {
        return json({ error: "Missing payment intent" }, 400);
      }
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) return json({ error: "Stripe not configured" }, 500);

      const r = await fetch(
        `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(stripe_payment_intent_id)}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      );
      const intent = await r.json();
      if (!r.ok) return json({ error: intent.error?.message ?? "Could not verify payment" }, 400);
      if (intent.status !== "succeeded") return json({ error: "Payment not completed" }, 400);
      const expectedAmount = Math.round(total_price * 100);
      if (Number(intent.amount) !== expectedAmount) {
        return json({ error: "Payment amount mismatch" }, 400);
      }
      verifiedIntentId = intent.id;
    }

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .insert({
        event_id,
        user_id: userId,
        attendee_name,
        attendee_email,
        attendee_phone: attendee_phone ?? null,
        ticket_count: tc,
        total_price,
        platform_fee,
        organiser_payout,
        waiver_accepted: true,
        status: "confirmed",
        stripe_payment_intent_id: verifiedIntentId,
      })
      .select("id")
      .single();
    if (bErr || !booking) return json({ error: bErr?.message ?? "Could not create booking" }, 500);

    await admin.from("notifications").insert({
      user_id: userId,
      type: "booking_confirmed",
      message: `Your booking for ${event.title} is confirmed.`,
    });
    if (event.organiser_id) {
      await admin.from("notifications").insert({
        user_id: event.organiser_id,
        type: "organiser_new_booking",
        message: `New booking for ${event.title} by ${attendee_name}.`,
      });
    }

    return json({ id: booking.id, ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
