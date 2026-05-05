// Cancel a booking and refund the Stripe payment if applicable.
// Requires STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: "Missing booking_id" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("*, events(title,date,time)")
      .eq("id", booking_id)
      .maybeSingle();

    if (bErr || !booking) return json({ error: "Booking not found" }, 404);
    if (booking.user_id !== userId) return json({ error: "Forbidden" }, 403);
    if (booking.status !== "confirmed") return json({ error: "Booking not cancellable" }, 400);

    const ev = booking.events as any;
    const eventDateTime = new Date(`${ev.date}T${ev.time ?? "00:00"}`);
    const hoursUntil = (eventDateTime.getTime() - Date.now()) / 36e5;
    if (hoursUntil < 2) return json({ error: "Too late to cancel (less than 2 hours)" }, 400);

    let refundId: string | null = null;
    if (booking.stripe_payment_intent_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
      const params = new URLSearchParams();
      params.append("payment_intent", booking.stripe_payment_intent_id);
      const r = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: data.error?.message ?? "Refund failed" }, 400);
      refundId = data.id ?? null;
    }

    const update: any = { status: "cancelled" };
    if (refundId) update.stripe_refund_id = refundId;
    const { error: uErr } = await admin.from("bookings").update(update).eq("id", booking_id);
    if (uErr) return json({ error: uErr.message }, 500);

    await admin.from("notifications").insert({
      user_id: userId,
      type: "booking_cancelled",
      message: `Your booking for ${ev.title} has been cancelled and a full refund has been initiated.`,
    });

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  function json(body: any, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
