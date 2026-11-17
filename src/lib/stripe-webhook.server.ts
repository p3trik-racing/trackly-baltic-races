// Server-only Stripe webhook event handling. Every branch is idempotent.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { confirmSlotPayment, confirmTicketPayment } from "@/lib/stripe.server";
import { safeSend, sendBookingCreated } from "@/lib/app-email.server";

const db = supabaseAdmin as any;

export async function handleStripeEvent(event: any) {
  const o = event.data?.object ?? {};
  switch (event.type) {
    case "payment_intent.succeeded": return onSucceeded(o);
    case "payment_intent.payment_failed":
      console.log("[stripe-webhook] payment failed", o.id, o.last_payment_error?.message ?? "");
      return;
    case "charge.refunded": return onRefunded(o);
    case "charge.dispute.created": return onDispute(o);
    case "account.updated":
      if (!o.id) return;
      await db.from("profiles").update({
        stripe_charges_enabled: !!o.charges_enabled, stripe_payouts_enabled: !!o.payouts_enabled, stripe_details_submitted: !!o.details_submitted,
      }).eq("stripe_account_id", event.account ?? o.id);
      return;
  }
}

async function onSucceeded(pi: any) {
  const md = pi.metadata ?? {};
  if (md.kind === "slot" && md.slot_booking_id && md.user_id) { await confirmSlotPayment(md.slot_booking_id, md.user_id, pi.id); return; }
  if (md.kind === "race_ticket" && md.race_ticket_id && md.user_id) { await confirmTicketPayment(md.race_ticket_id, md.user_id, pi.id); return; }
  if (md.event_id && md.user_id) await createEventBooking(pi);
}

/** Mirrors the create-booking edge function checks for a paid booking. */
async function createEventBooking(pi: any) {
  const md = pi.metadata ?? {};
  const userId = md.user_id as string, eventId = md.event_id as string;
  const { data: existing } = await db.from("bookings").select("id").eq("stripe_payment_intent_id", pi.id).maybeSingle();
  if (existing) return;
  const tc = Number(md.ticket_count);
  if (!Number.isInteger(tc) || tc < 1 || tc > 20) return console.error("[stripe-webhook] bad ticket_count", pi.id);
  const { data: prof } = await db.from("profiles").select("blocked,full_name,username,email,phone").eq("id", userId).maybeSingle();
  if (prof?.blocked) return console.error("[stripe-webhook] blocked user paid", pi.id);
  const { data: ev } = await db.from("events").select("id,title,price,deposit,status,capacity,organiser_id").eq("id", eventId).maybeSingle();
  if (!ev || ev.status !== "live") return console.error("[stripe-webhook] event unavailable", pi.id);
  if (ev.capacity && ev.capacity > 0) {
    const { data: rows } = await db.from("bookings").select("ticket_count,status").eq("event_id", eventId);
    const booked = (rows ?? []).filter((b: any) => b.status !== "cancelled").reduce((s: number, b: any) => s + (b.ticket_count ?? 1), 0);
    if (booked + tc > ev.capacity) return console.error("[stripe-webhook] no spots left — needs manual refund", pi.id);
  }
  const price = Number(ev.price) || 0;
  if (price === 0) return;
  const deposit = Number(ev.deposit) || 0;
  const onlinePrice = deposit > 0 && deposit < price ? deposit : price;
  const subtotal = +(onlinePrice * tc).toFixed(2);
  const platform_fee = +(subtotal * 0.05).toFixed(2);
  const total_price = +(subtotal + platform_fee).toFixed(2);
  if (String(pi.currency).toLowerCase() !== "eur" || Number(pi.amount) !== Math.round(total_price * 100)) return console.error("[stripe-webhook] amount mismatch", pi.id);
  const name = String(md.attendee_name || prof?.full_name || prof?.username || "").trim().slice(0, 100);
  const email = String(md.attendee_email || prof?.email || "").trim().slice(0, 200);
  const phone = String(md.attendee_phone || prof?.phone || "").trim().slice(0, 40);
  const { data: booking, error } = await db.from("bookings").insert({
    event_id: eventId, user_id: userId, attendee_name: name || "—", attendee_email: email, attendee_phone: phone || null,
    ticket_count: tc, total_price, platform_fee, organiser_payout: subtotal, waiver_accepted: true, status: "confirmed",
    stripe_payment_intent_id: pi.id,
  }).select("id").single();
  if (error?.code === "23505") return; // client created it meanwhile
  if (error || !booking) throw new Error(error?.message ?? "Could not create booking");
  await db.from("notifications").insert({ user_id: userId, type: "booking_confirmed", message: `Your booking for ${ev.title} is confirmed.` });
  if (ev.organiser_id) await db.from("notifications").insert({ user_id: ev.organiser_id, type: "organiser_new_booking", message: `New booking for ${ev.title} by ${name}.` });
  await sendBookingCreated(booking.id, userId); // idempotency keys prevent duplicates with the client path
}

async function onRefunded(ch: any) {
  const piId = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
  if (!piId) return;
  const rid = ch.refunds?.data?.[0]?.id ?? `refund_${ch.id}`;
  await db.from("slot_bookings").update({ payment_status: "refunded", stripe_refund_id: rid }).eq("stripe_payment_intent_id", piId).neq("payment_status", "refunded");
  await db.from("race_tickets").update({ payment_status: "refunded", stripe_refund_id: rid }).eq("stripe_payment_intent_id", piId).neq("payment_status", "refunded");
  await db.from("bookings").update({ stripe_refund_id: rid }).eq("stripe_payment_intent_id", piId).is("stripe_refund_id", null);
}

async function onDispute(dp: any) {
  const piId = typeof dp.payment_intent === "string" ? dp.payment_intent : dp.payment_intent?.id;
  if (!piId) return;
  const upd = { stripe_dispute_id: dp.id, disputed_at: new Date().toISOString() };
  let item = "";
  for (const [table, label] of [["bookings", "Booking"], ["slot_bookings", "Track slot"], ["race_tickets", "Race ticket"]] as const) {
    const { data } = await db.from(table).update(upd).eq("stripe_payment_intent_id", piId).select("id");
    if (data?.length) item = `${label} ${String(data[0].id).slice(0, 8).toUpperCase()}`;
  }
  const amount = `€${(Number(dp.amount ?? 0) / 100).toFixed(2)}`;
  await safeSend("stripe-dispute-admin", "hello@trackly.racing", {
    heading: "Stripe dispute opened", amount, item: item || piId,
    fields: [["Dispute", dp.id], ["Reason", dp.reason ?? ""], ["Payment intent", piId], ["Item", item || "not matched"]],
  }, `dispute-${dp.id}`);
}
