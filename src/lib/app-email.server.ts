// Server-only: loads data with the service role and sends app emails. Failures are logged, never thrown.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { en } from "@/i18n/en";
import { ru } from "@/i18n/ru";
import { lv } from "@/i18n/lv";
import { SITE_URL } from "@/lib/site";

const REPLY_TO = "admin@majorkariga.com";
type L = "en" | "ru" | "lv";
const DICTS: Record<L, Record<string, string>> = { en: en as any, ru: ru as any, lv: lv as any };
const LOCALES: Record<L, string> = { en: "en-GB", ru: "ru-RU", lv: "lv-LV" };

export const pick = (l?: string | null): L => (l === "ru" || l === "lv" ? l : "en");

export async function safeSend(template: string, to: string | null | undefined, data: Record<string, any>, key: string) {
  if (!to) return;
  try {
    const r = await sendTemplateEmail(template, to, { templateData: data, idempotencyKey: key, replyTo: REPLY_TO });
    if (!r.sent) console.log(`[email] ${template} skipped: ${r.reason}`);
  } catch (e: any) {
    console.error(`[email] ${template} failed:`, e?.code ?? "", e?.message ?? e);
  }
}

export async function userFromToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

async function profile(userId?: string | null) {
  if (!userId) return null;
  const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data as any;
}

function reqLabels(list: string[] | null | undefined, l: L) {
  return (list ?? []).map((r) => DICTS[l][`req.${r}`] ?? DICTS.en[`req.${r}`] ?? r);
}

function when(date: string, time: string | null | undefined, l: L) {
  const d = new Date(`${date}T00:00:00`).toLocaleDateString(LOCALES[l], { day: "numeric", month: "long", year: "numeric" });
  return time ? `${d} · ${String(time).slice(0, 5)}` : d;
}

const loc = (e: any) => [e.location_name, e.city, e.country].filter(Boolean).join(", ");
const eur = (n: number) => `€${Number(n).toFixed(2)}`;

async function loadBooking(bookingId: string) {
  const { data } = await supabaseAdmin.from("bookings")
    .select("*, events(id,title,date,time,location_name,city,country,requirements,price,deposit,organiser_id)")
    .eq("id", bookingId).maybeSingle();
  return data as any;
}

/** 1 + 5: booking confirmation to the attendee and new-booking notice to the organiser. */
export async function sendBookingCreated(bookingId: string, callerId: string) {
  const b = await loadBooking(bookingId);
  if (!b || b.user_id !== callerId || b.status !== "confirmed") return;
  const e = b.events;
  const p = await profile(b.user_id);
  const l = pick(p?.lang);
  if (p?.booking_confirmations !== false) {
    const price = Number(e.price) || 0;
    const dep = Number(e.deposit) || 0;
    const hasDep = dep > 0 && dep < price;
    const code = String(b.check_in_code ?? "").toUpperCase();
    await safeSend("booking-confirmed", b.attendee_email, {
      lang: l, name: b.attendee_name, eventTitle: e.title, when: when(e.date, e.time, l), location: loc(e),
      spots: b.ticket_count, paidNow: eur(Number(b.total_price ?? b.amount_paid ?? 0)),
      balance: hasDep ? eur((price - dep) * (b.ticket_count ?? 1)) : null,
      requirements: reqLabels(e.requirements, l), reference: b.id.slice(0, 8).toUpperCase(), code,
      passUrl: `${SITE_URL}/booking/${b.id}`,
      qrUrl: code ? `${SITE_URL}/api/public/qr/${b.id}?c=${code}` : undefined,
    }, `booking-confirmed-${b.id}`);
  }
  if (e.organiser_id) {
    const op = await profile(e.organiser_id);
    await safeSend("new-booking", op?.email, {
      lang: pick(op?.lang), eventTitle: e.title, name: b.attendee_name, spots: b.ticket_count,
      email: b.attendee_email, phone: b.attendee_phone ?? "", url: `${SITE_URL}/organiser/events/${e.id}/bookings`,
    }, `new-booking-${b.id}`);
  }
}

/** 2: attendee cancelled their own booking. */
export async function sendBookingCancelled(bookingId: string, callerId: string) {
  const b = await loadBooking(bookingId);
  if (!b || b.user_id !== callerId || b.status !== "cancelled") return;
  const p = await profile(b.user_id);
  const paid = Number(b.total_price ?? 0);
  const fee = Number(b.platform_fee ?? 0);
  const refunded = b.stripe_payment_intent_id && paid > 0 ? eur(Math.max(0, paid - fee)) : null;
  await safeSend("booking-cancelled", b.attendee_email, {
    lang: pick(p?.lang), eventTitle: b.events?.title, refunded, reference: b.id.slice(0, 8).toUpperCase(),
  }, `booking-cancelled-${b.id}`);
}

/** 3: one email per cancelled booking of a cancelled event. */
export async function sendEventCancelled(eventId: string, bookingIds: string[]) {
  const { data: e } = await supabaseAdmin.from("events").select("title,date").eq("id", eventId).maybeSingle();
  if (!e || !bookingIds.length) return;
  const { data: bks } = await supabaseAdmin.from("bookings").select("id,attendee_email,user_id").in("id", bookingIds);
  for (const b of (bks ?? []) as any[]) {
    const p = await profile(b.user_id);
    const l = pick(p?.lang);
    await safeSend("event-cancelled", b.attendee_email, {
      lang: l, eventTitle: e.title, when: when(e.date, null, l), reference: b.id.slice(0, 8).toUpperCase(),
    }, `event-cancelled-${b.id}`);
  }
}

/** 4: reminder for each confirmed booking of a live event starting in 20–28 h. */
export async function runReminders() {
  const now = Date.now();
  const from = new Date(now + 20 * 36e5), to = new Date(now + 28 * 36e5);
  const d0 = from.toISOString().slice(0, 10), d1 = to.toISOString().slice(0, 10);
  const { data: events } = await supabaseAdmin.from("events")
    .select("id,title,date,time,location_name,city,country,requirements")
    .eq("status", "live").gte("date", d0).lte("date", d1);
  let sent = 0;
  for (const e of (events ?? []) as any[]) {
    // Event times are local Riga time; approximate with +03:00/+02:00 via Europe/Riga offset.
    const start = rigaTime(e.date, e.time);
    if (start < from.getTime() || start > to.getTime()) continue;
    const { data: bks } = await supabaseAdmin.from("bookings")
      .select("id,user_id,attendee_email,check_in_code")
      .eq("event_id", e.id).eq("status", "confirmed").is("reminder_sent_at", null);
    for (const b of (bks ?? []) as any[]) {
      const p = await profile(b.user_id);
      if (p?.event_reminders !== false) {
        const l = pick(p?.lang);
        await safeSend("event-reminder-24h", b.attendee_email, {
          lang: l, eventTitle: e.title, when: when(e.date, e.time, l), location: loc(e),
          requirements: reqLabels(e.requirements, l), code: String(b.check_in_code ?? "").toUpperCase(),
          passUrl: `${SITE_URL}/booking/${b.id}`,
        }, `event-reminder-${b.id}`);
        sent++;
      }
      await supabaseAdmin.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
    }
  }
  return sent;
}

function rigaTime(date: string, time?: string | null) {
  const t = time ? String(time).slice(0, 5) : "09:00";
  const guess = new Date(`${date}T${t}:00Z`).getTime();
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Riga", hour: "2-digit", hour12: false });
  const rigaHour = Number(fmt.format(new Date(guess)));
  const utcHour = new Date(guess).getUTCHours();
  const offset = ((rigaHour - utcHour + 24) % 24) * 36e5;
  return guess - offset;
}

/** 6 + 7: organiser application emails. */
export async function sendApplicationEmail(type: "new_application" | "approved" | "rejected", applicationId: string, callerId: string) {
  const { data: a } = await supabaseAdmin.from("organiser_applications").select("*").eq("id", applicationId).maybeSingle();
  if (!a) return;
  if (type === "new_application") {
    if (a.user_id !== callerId) return;
    const fields: [string, string][] = [
      ["Full name", a.full_name], ["Email", a.email], ["Phone", a.phone], ["Type", a.organiser_type],
      ["Company", a.company ?? ""], ["Registration no.", a.registration_no ?? ""], ["Country", a.country ?? ""],
      ["City", a.city ?? ""], ["Venues", a.venues ?? ""], ["Event types", (a.event_types ?? []).join(", ")],
      ["Events per year", a.events_per_year ?? ""], ["Website", a.website ?? ""], ["Socials", a.socials ?? ""],
      ["Experience", a.experience ?? ""], ["Message", a.message ?? ""],
    ].filter(([, v]) => v) as [string, string][];
    await safeSend("organiser-application-new", "admin@majorkariga.com", {
      heading: "New organiser application", fullName: a.full_name, company: a.company, fields,
    }, `organiser-application-new-${a.id}`);
    return;
  }
  if (!(await isAdmin(callerId))) return;
  const p = await profile(a.user_id);
  const to = p?.email || a.email;
  if (type === "approved") await safeSend("organiser-approved", to, { lang: pick(p?.lang) }, `organiser-approved-${a.id}`);
  else await safeSend("organiser-rejected", to, { lang: pick(p?.lang), note: a.admin_note }, `organiser-rejected-${a.id}`);
}

/** 8: competition entry confirmation + admin copy. */
export async function sendCompetitionEntry(entryId: string, callerId: string) {
  const { data: en_ } = await supabaseAdmin.from("competition_entries").select("*, competitions(name,slug)").eq("id", entryId).maybeSingle();
  const e = en_ as any;
  if (!e || e.user_id !== callerId) return;
  const p = await profile(e.user_id);
  const comp = e.competitions?.name ?? "";
  await safeSend("competition-entry", e.email, { lang: pick(p?.lang), competition: comp, slug: e.competitions?.slug }, `competition-entry-${e.id}`);
  const fields: [string, string][] = [
    ["Competition", comp], ["Name", e.full_name], ["Email", e.email], ["Phone", e.phone], ["Car", e.car],
    ["Class", e.class ?? ""], ["Has licence", e.has_licence ? "Yes" : "No"], ["Needs help with", (e.needs_help ?? []).join(", ")],
    ["Message", e.message ?? ""],
  ].filter(([, v]) => v) as [string, string][];
  await safeSend("competition-entry-admin", "admin@majorkariga.com", {
    heading: "New competition entry", competition: comp, fullName: e.full_name, fields, link: `${SITE_URL}/admin?tab=Competitions`,
  }, `competition-entry-admin-${e.id}`);
}

/** Admin granted/revoked organiser role. Returns the recipient's display name. */
export async function sendOrganiserRoleEmail(userId: string, on: boolean, callerId: string) {
  if (!(await isAdmin(callerId))) return { ok: false, name: "" };
  const p = await profile(userId);
  const name = p?.full_name || p?.username || p?.email || "";
  await safeSend(on ? "organiser-role-granted" : "organiser-role-revoked", p?.email, { lang: pick(p?.lang) },
    `organiser-role-${on ? "granted" : "revoked"}-${userId}-${Date.now()}`);
  return { ok: true, name };
}
