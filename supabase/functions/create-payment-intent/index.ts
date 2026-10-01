// Creates a Stripe PaymentIntent. Amount is computed server-side from the event;
// the client only sends { event_id, ticket_count }. Requires a signed-in user.
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe is not configured" }, 500);

    const body = await req.json().catch(() => null);
    const event_id = body?.event_id;
    const tc = Number(body?.ticket_count);
    if (!event_id || typeof event_id !== "string" || !/^[0-9a-f-]{36}$/i.test(event_id)) {
      return json({ error: "Missing event_id" }, 400);
    }
    if (!Number.isInteger(tc) || tc < 1 || tc > 20) return json({ error: "Invalid ticket count" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: prof } = await admin.from("profiles").select("blocked").eq("id", userId).maybeSingle();
    if (prof?.blocked) return json({ error: "Account blocked" }, 403);

    const { data: event, error: evErr } = await admin
      .from("events")
      .select("id,title,price,deposit,status,capacity,organiser_id")
      .eq("id", event_id)
      .maybeSingle();
    if (evErr || !event) return json({ error: "Event not found" }, 404);
    if (event.status !== "live") return json({ error: "Event not available" }, 400);

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

    // Same formula as create-booking.
    const price = Number(event.price) || 0;
    if (price === 0) return json({ error: "This event is free — no payment needed" }, 400);
    const deposit = Number(event.deposit) || 0;
    const onlinePrice = deposit > 0 && deposit < price ? deposit : price;
    const subtotal = +(onlinePrice * tc).toFixed(2);
    const platform_fee = +(subtotal * 0.05).toFixed(2);
    const total_price = +(subtotal + platform_fee).toFixed(2);
    const amount = Math.round(total_price * 100);

    const params = new URLSearchParams();
    params.append("amount", String(amount));
    params.append("currency", "eur");
    params.append("description", `Majorka Racing — ${String(event.title).slice(0, 200)}`);
    params.append("metadata[event_id]", event_id);
    params.append("metadata[user_id]", userId);
    params.append("metadata[ticket_count]", String(tc));
    params.append("metadata[organiser_id]", String(event.organiser_id ?? ""));
    params.append("transfer_group", `event_${event_id}`);
    params.append("automatic_payment_methods[enabled]", "true");

    const resp = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const intent = await resp.json();
    if (!resp.ok) return json({ error: intent.error?.message ?? "Stripe error" }, 400);

    return json({ clientSecret: intent.client_secret });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
