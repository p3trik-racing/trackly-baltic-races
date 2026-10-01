// Server-only Stripe REST helpers (no SDK) + shared payment logic.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL } from "@/lib/site";

export const FEE_RATE = 0.05;
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const cents = (n: number) => Math.round(n * 100);

export async function stripe(path: string, params?: Record<string, string | number | boolean | undefined>, opts: { method?: string; idempotencyKey?: string } = {}) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe is not configured");
  const method = opts.method ?? (params ? "POST" : "GET");
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null) body.append(k, String(v));
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  const res = await fetch(`https://api.stripe.com/v1${path}`, { method, headers, body: method === "GET" ? undefined : body.toString() });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe error (${res.status})`);
  return json;
}

export async function requireUser(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Please sign in again");
  return data.user;
}
export async function hasRole(userId: string, role: "admin" | "organiser") {
  const { data } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: role });
  return !!data;
}

/* ---------- Connect onboarding ---------- */

export async function connectAccountLink(userId: string, email: string | undefined, country: "LV" | "EE" | "LT") {
  if (!(await hasRole(userId, "organiser")) && !(await hasRole(userId, "admin"))) throw new Error("Organisers only");
  const { data: prof } = await supabaseAdmin.from("profiles").select("stripe_account_id,email").eq("id", userId).maybeSingle();
  let acct = prof?.stripe_account_id ?? null;
  if (!acct) {
    const a = await stripe("/accounts", {
      type: "express", country, email: prof?.email ?? email,
      "business_profile[url]": "https://majorkaracing.com",
      "capabilities[card_payments][requested]": true, "capabilities[transfers][requested]": true,
      "metadata[user_id]": userId,
    }, { idempotencyKey: `connect-account-${userId}` });
    acct = a.id as string;
    await supabaseAdmin.from("profiles").update({ stripe_account_id: acct }).eq("id", userId);
  }
  const link = await stripe("/account_links", {
    account: acct!, type: "account_onboarding",
    refresh_url: `${SITE_URL}/organiser?stripe=refresh`, return_url: `${SITE_URL}/organiser?stripe=return`,
  });
  return link.url as string;
}

export async function connectStatus(userId: string) {
  const { data: prof } = await supabaseAdmin.from("profiles").select("stripe_account_id").eq("id", userId).maybeSingle();
  if (!prof?.stripe_account_id) return { connected: false, charges: false, payouts: false, details: false };
  const a = await stripe(`/accounts/${prof.stripe_account_id}`);
  const s = { stripe_charges_enabled: !!a.charges_enabled, stripe_payouts_enabled: !!a.payouts_enabled, stripe_details_submitted: !!a.details_submitted };
  await supabaseAdmin.from("profiles").update(s).eq("id", userId);
  return { connected: true, charges: s.stripe_charges_enabled, payouts: s.stripe_payouts_enabled, details: s.stripe_details_submitted };
}

export async function connectDashboardLink(userId: string) {
  const { data: prof } = await supabaseAdmin.from("profiles").select("stripe_account_id").eq("id", userId).maybeSingle();
  if (!prof?.stripe_account_id) throw new Error("Stripe is not connected yet");
  const l = await stripe(`/accounts/${prof.stripe_account_id}/login_links`, {});
  return l.url as string;
}

/* ---------- Slot payments ---------- */

async function loadSlotBooking(id: string, userId: string) {
  const { data: b } = await supabaseAdmin.from("slot_bookings").select("*, venue_slots(id,status,venue_id,date)").eq("id", id).maybeSingle();
  if (!b || b.user_id !== userId) throw new Error("Booking not found");
  const slot: any = b.venue_slots;
  if (!["reserved", "confirmed"].includes(b.status)) throw new Error("This booking is cancelled");
  if (b.payment_status !== "pending") throw new Error(b.payment_status === "paid" ? "Already paid" : "No payment needed");
  if (!slot || slot.status === "cancelled") throw new Error("This slot is cancelled");
  if (b.kind === "split" && slot.status !== "confirmed") throw new Error("You'll pay when the group is confirmed");
  if (b.kind === "whole" && b.pay_by && new Date(b.pay_by).getTime() < Date.now()) throw new Error("Payment time expired — please book again");
  const base = r2(Number(b.amount));
  if (!(base > 0)) throw new Error("No payment needed");
  const fee = r2(base * FEE_RATE);
  return { b, slot, base, fee, total: r2(base + fee) };
}

export async function createSlotPayment(id: string, userId: string) {
  const { b, slot, fee, total } = await loadSlotBooking(id, userId);
  await supabaseAdmin.from("slot_bookings").update({ platform_fee: fee }).eq("id", id);
  const pi = await stripe("/payment_intents", {
    amount: cents(total), currency: "eur", "automatic_payment_methods[enabled]": true,
    description: "Majorka Racing — track time", transfer_group: `slot_${slot.id}`,
    "metadata[kind]": "slot", "metadata[slot_booking_id]": b.id, "metadata[user_id]": userId, "metadata[venue_id]": slot.venue_id,
  }, { idempotencyKey: `slot-pi-${b.id}-${cents(total)}` });
  return { clientSecret: pi.client_secret as string, total };
}

export async function confirmSlotPayment(id: string, userId: string, piId: string) {
  const { b, total } = await loadSlotBooking(id, userId);
  const pi = await stripe(`/payment_intents/${encodeURIComponent(piId)}`);
  if (pi.status !== "succeeded") throw new Error("Payment not completed");
  if (pi.currency !== "eur" || pi.amount !== cents(total)) throw new Error("Payment amount mismatch");
  if (pi.metadata?.kind !== "slot" || pi.metadata?.slot_booking_id !== b.id || pi.metadata?.user_id !== userId) throw new Error("Payment does not match this booking");
  const upd: any = { payment_status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: piId };
  if (b.kind === "whole") upd.status = "confirmed";
  const { error } = await supabaseAdmin.from("slot_bookings").update(upd).eq("id", id).eq("payment_status", "pending");
  if (error) throw new Error(error.code === "23505" ? "Payment already used" : error.message);
  return { ok: true };
}

/* ---------- Race ticket payments ---------- */

async function loadTicket(id: string, userId: string) {
  const { data: tk } = await supabaseAdmin.from("race_tickets").select("*, race_ticket_types(kind,competition_id,round_date)").eq("id", id).maybeSingle();
  if (!tk || tk.user_id !== userId) throw new Error("Ticket not found");
  const tt: any = tk.race_ticket_types;
  if (tk.status === "cancelled") throw new Error("This ticket is cancelled");
  if (tk.payment_status !== "pending") throw new Error(tk.payment_status === "paid" ? "Already paid" : "No payment needed");
  if (tt?.kind === "racer" && tk.status !== "confirmed") throw new Error("Wait until Majorka confirms your entry");
  const base = r2(Number(tk.amount));
  if (!(base > 0)) throw new Error("No payment needed");
  const fee = r2(base * FEE_RATE);
  return { tk, tt, fee, total: r2(base + fee) };
}

export async function createTicketPayment(id: string, userId: string) {
  const { tk, tt, fee, total } = await loadTicket(id, userId);
  await supabaseAdmin.from("race_tickets").update({ platform_fee: fee }).eq("id", id);
  const pi = await stripe("/payment_intents", {
    amount: cents(total), currency: "eur", "automatic_payment_methods[enabled]": true,
    description: "Majorka Racing — race ticket", transfer_group: `race_${tt?.competition_id ?? ""}`,
    "metadata[kind]": "race_ticket", "metadata[race_ticket_id]": tk.id, "metadata[user_id]": userId,
  }, { idempotencyKey: `ticket-pi-${tk.id}-${cents(total)}` });
  return { clientSecret: pi.client_secret as string, total };
}

export async function confirmTicketPayment(id: string, userId: string, piId: string) {
  const { tk, tt, total } = await loadTicket(id, userId);
  const pi = await stripe(`/payment_intents/${encodeURIComponent(piId)}`);
  if (pi.status !== "succeeded") throw new Error("Payment not completed");
  if (pi.currency !== "eur" || pi.amount !== cents(total)) throw new Error("Payment amount mismatch");
  if (pi.metadata?.kind !== "race_ticket" || pi.metadata?.race_ticket_id !== tk.id || pi.metadata?.user_id !== userId) throw new Error("Payment does not match this ticket");
  const upd: any = { payment_status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: piId };
  if (tt?.kind === "spectator") upd.status = "confirmed";
  const { error } = await supabaseAdmin.from("race_tickets").update(upd).eq("id", id).eq("payment_status", "pending");
  if (error) throw new Error(error.code === "23505" ? "Payment already used" : error.message);
  return { ok: true };
}

/* ---------- Refunds ---------- */

async function refund(piId: string, amountEur: number | null, key: string) {
  const r = await stripe("/refunds", { payment_intent: piId, amount: amountEur == null ? undefined : cents(amountEur) }, { idempotencyKey: key });
  return r.id as string;
}

/** Calls cancel_slot_booking as the user (keeps DB rules), then refunds paid, untransferred bookings (amount without the 5% fee). */
export async function cancelSlotWithRefund(token: string, id: string) {
  const user = await requireUser(token);
  const { data: b } = await supabaseAdmin.from("slot_bookings").select("id,slot_id,user_id,is_host,kind").eq("id", id).maybeSingle();
  if (!b || b.user_id !== user.id) throw new Error("Booking not found");
  const { createClient } = await import("@supabase/supabase-js");
  const userClient = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { error } = await userClient.rpc("cancel_slot_booking", { _booking_id: id });
  if (error) throw new Error(error.message);
  let q = supabaseAdmin.from("slot_bookings").select("*").eq("status", "cancelled").eq("payment_status", "paid").is("stripe_refund_id", null);
  q = b.is_host ? q.eq("slot_id", b.slot_id) : q.eq("id", id);
  const { data: rows } = await q;
  const warnings: string[] = [];
  for (const r of rows ?? []) {
    if (!r.stripe_payment_intent_id) continue;
    if (r.stripe_transfer_id) { warnings.push(`Booking ${r.id} was already paid out — no automatic refund`); continue; }
    try {
      const rid = await refund(r.stripe_payment_intent_id, r2(Number(r.amount)), `refund-slot-${r.id}`);
      await supabaseAdmin.from("slot_bookings").update({ stripe_refund_id: rid, payment_status: "refunded" }).eq("id", r.id);
    } catch (e: any) { warnings.push(e.message); }
  }
  return { ok: true, warnings };
}

/** User cancel (≥48h before round, via RPC rules) or admin cancel — full refund unless already refunded. */
export async function cancelTicketWithRefund(token: string, id: string) {
  const user = await requireUser(token);
  const admin = await hasRole(user.id, "admin");
  const { data: tk } = await supabaseAdmin.from("race_tickets").select("*, race_ticket_types(round_date)").eq("id", id).maybeSingle();
  if (!tk) throw new Error("Ticket not found");
  if (!admin) {
    if (tk.user_id !== user.id) throw new Error("Ticket not found");
    const rd = (tk.race_ticket_types as any)?.round_date;
    if (tk.payment_status === "paid" && rd && new Date(`${rd}T00:00:00`).getTime() - Date.now() < 48 * 36e5) throw new Error("Too late to cancel (less than 48 hours)");
    const { createClient } = await import("@supabase/supabase-js");
    const uc = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
      auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { error } = await uc.rpc("cancel_race_ticket", { _ticket_id: id });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("race_tickets").update({ status: "cancelled" }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  if (tk.payment_status === "paid" && tk.stripe_payment_intent_id && !tk.stripe_refund_id) {
    const rid = await refund(tk.stripe_payment_intent_id, null, `refund-ticket-${tk.id}`);
    await supabaseAdmin.from("race_tickets").update({ stripe_refund_id: rid, payment_status: "refunded" }).eq("id", id);
  }
  return { ok: true };
}

/* ---------- Payouts (cron) ---------- */

export async function runPayouts() {
  const today = new Date().toISOString().slice(0, 10);
  const res = { events: 0, slots: 0, errors: 0, skipped: 0 };
  const acctCache = new Map<string, string | null>();
  async function dest(ownerId: string | null | undefined) {
    if (!ownerId) return null;
    if (acctCache.has(ownerId)) return acctCache.get(ownerId)!;
    const { data: p } = await supabaseAdmin.from("profiles").select("stripe_account_id,stripe_payouts_enabled").eq("id", ownerId).maybeSingle();
    const a = p?.stripe_account_id && p.stripe_payouts_enabled ? p.stripe_account_id : null;
    acctCache.set(ownerId, a);
    return a;
  }

  const { data: bks } = await supabaseAdmin.from("bookings")
    .select("id,event_id,organiser_payout,stripe_payment_intent_id,events!inner(date,organiser_id,category)")
    .eq("status", "confirmed").not("stripe_payment_intent_id", "is", null).is("stripe_transfer_id", null).is("stripe_refund_id", null)
    .lt("events.date", today).limit(200);
  for (const b of (bks ?? []) as any[]) {
    const ev = b.events;
    if (ev.category === "majorka_special" && (await hasRole(ev.organiser_id, "admin"))) { res.skipped++; continue; }
    const acct = await dest(ev.organiser_id);
    const amt = cents(Number(b.organiser_payout));
    if (!acct || amt <= 0) { res.skipped++; continue; }
    try {
      const tr = await stripe("/transfers", { amount: amt, currency: "eur", destination: acct, transfer_group: `event_${b.event_id}`, "metadata[booking_id]": b.id }, { idempotencyKey: `transfer-bookings-${b.id}` });
      await supabaseAdmin.from("bookings").update({ stripe_transfer_id: tr.id, transferred_at: new Date().toISOString(), transfer_error: null }).eq("id", b.id);
      res.events++;
    } catch (e: any) {
      await supabaseAdmin.from("bookings").update({ transfer_error: String(e.message).slice(0, 500) }).eq("id", b.id);
      res.errors++;
    }
  }

  const { data: sbs } = await supabaseAdmin.from("slot_bookings")
    .select("id,slot_id,amount,venue_slots!inner(date,venues(owner_id))")
    .eq("payment_status", "paid").neq("status", "cancelled").is("stripe_transfer_id", null).is("stripe_refund_id", null)
    .lt("venue_slots.date", today).limit(200);
  for (const s of (sbs ?? []) as any[]) {
    const acct = await dest(s.venue_slots?.venues?.owner_id);
    const amt = cents(Number(s.amount));
    if (!acct || amt <= 0) { res.skipped++; continue; }
    try {
      const tr = await stripe("/transfers", { amount: amt, currency: "eur", destination: acct, transfer_group: `slot_${s.slot_id}`, "metadata[slot_booking_id]": s.id }, { idempotencyKey: `transfer-slot_bookings-${s.id}` });
      await supabaseAdmin.from("slot_bookings").update({ stripe_transfer_id: tr.id, transferred_at: new Date().toISOString() }).eq("id", s.id);
      res.slots++;
    } catch (e: any) { console.error("[payouts] slot", s.id, e.message); res.errors++; }
  }
  return res;
}

/* ---------- Admin ---------- */

export async function adminPayments() {
  const [ev, sl, rt, orgs] = await Promise.all([
    supabaseAdmin.from("bookings").select("id,created_at,attendee_name,total_price,platform_fee,organiser_payout,status,stripe_payment_intent_id,stripe_refund_id,stripe_transfer_id,transferred_at,transfer_error,events(title,date)").not("stripe_payment_intent_id", "is", null).order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.from("slot_bookings").select("id,created_at,attendee_name,amount,platform_fee,status,payment_status,stripe_payment_intent_id,stripe_refund_id,stripe_transfer_id,transferred_at,venue_slots(date,venues(name))").not("stripe_payment_intent_id", "is", null).order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.from("race_tickets").select("id,created_at,holder_name,amount,platform_fee,status,payment_status,stripe_payment_intent_id,stripe_refund_id,race_ticket_types(name,round_date,competitions(name))").not("stripe_payment_intent_id", "is", null).order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.from("profiles").select("id,full_name,email,stripe_account_id,stripe_charges_enabled,stripe_payouts_enabled,stripe_details_submitted,is_organiser").or("is_organiser.eq.true,stripe_account_id.not.is.null"),
  ]);
  const rows: any[] = [];
  for (const b of (ev.data ?? []) as any[]) rows.push({ kind: "event", id: b.id, date: b.created_at, who: b.attendee_name, item: b.events?.title, gross: Number(b.total_price), fee: Number(b.platform_fee), payout: Number(b.organiser_payout), status: b.status, refund: b.stripe_refund_id, transfer: b.stripe_transfer_id, transfer_error: b.transfer_error, payment_intent: b.stripe_payment_intent_id });
  for (const b of (sl.data ?? []) as any[]) rows.push({ kind: "slot", id: b.id, date: b.created_at, who: b.attendee_name, item: `${b.venue_slots?.venues?.name ?? "Track"} ${b.venue_slots?.date ?? ""}`, gross: r2(Number(b.amount) + Number(b.platform_fee)), fee: Number(b.platform_fee), payout: Number(b.amount), status: `${b.status}/${b.payment_status}`, refund: b.stripe_refund_id, transfer: b.stripe_transfer_id, transfer_error: null, payment_intent: b.stripe_payment_intent_id });
  for (const b of (rt.data ?? []) as any[]) rows.push({ kind: "race", id: b.id, date: b.created_at, who: b.holder_name, item: `${b.race_ticket_types?.competitions?.name ?? ""} · ${b.race_ticket_types?.name ?? ""}`, gross: r2(Number(b.amount) + Number(b.platform_fee)), fee: Number(b.platform_fee), payout: 0, status: `${b.status}/${b.payment_status}`, refund: b.stripe_refund_id, transfer: null, transfer_error: null, payment_intent: b.stripe_payment_intent_id });
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  const live = rows.filter((r) => !r.refund);
  const totals = {
    gross: r2(live.reduce((s, r) => s + r.gross, 0)),
    fees: r2(live.reduce((s, r) => s + r.fee, 0)),
    pending: r2(live.filter((r) => r.kind !== "race" && !r.transfer && !String(r.status).startsWith("cancelled")).reduce((s, r) => s + r.payout, 0)),
    transferred: r2(live.filter((r) => r.transfer).reduce((s, r) => s + r.payout, 0)),
  };
  return { totals, rows, organisers: orgs.data ?? [] };
}

export async function enableApplePayDomain() {
  const list = await stripe("/payment_method_domains?domain_name=majorkaracing.com&limit=1");
  if (list.data?.length) return { already: true, id: list.data[0].id };
  const d = await stripe("/payment_method_domains", { domain_name: "majorkaracing.com" }, { idempotencyKey: "pmd-majorkaracing.com" });
  return { already: false, id: d.id };
}
