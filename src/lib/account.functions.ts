import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Result = { ok: true } | { ok: false; reason: "unauthorized" | "admin" | "paid_upcoming" | "failed"; message?: string };

export const deleteMyAccount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<Result> => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: u, error: uErr } = await db.auth.getUser(data.accessToken);
    if (uErr || !u.user) return { ok: false, reason: "unauthorized" };
    const uid = u.user.id;

    const { data: admin } = await db.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (admin) return { ok: false, reason: "admin" };

    const today = new Date().toISOString().slice(0, 10);

    // Upcoming items
    const { data: bks } = await db.from("bookings")
      .select("id,status,total_price,stripe_payment_intent_id,events!inner(date)")
      .eq("user_id", uid).neq("status", "cancelled").gte("events.date", today);
    const { data: sbs } = await db.from("slot_bookings")
      .select("id,status,payment_status,venue_slots!inner(date)")
      .eq("user_id", uid).in("status", ["reserved", "confirmed"]).gte("venue_slots.date", today);
    const { data: rts } = await db.from("race_tickets")
      .select("id,status,payment_status,race_ticket_types!inner(round_date)")
      .eq("user_id", uid).neq("status", "cancelled");
    const upcomingTickets = (rts ?? []).filter((r: any) => !r.race_ticket_types?.round_date || r.race_ticket_types.round_date >= today);

    const paid =
      (bks ?? []).some((b: any) => b.status === "confirmed" && (Number(b.total_price) > 0 || b.stripe_payment_intent_id)) ||
      (sbs ?? []).some((b: any) => b.payment_status === "paid") ||
      upcomingTickets.some((r: any) => r.payment_status === "paid");
    if (paid) return { ok: false, reason: "paid_upcoming" };

    try {
      const ids = (rows: any[] | null | undefined) => (rows ?? []).map((r) => r.id);
      const bIds = ids(bks), sIds = ids(sbs), tIds = ids(upcomingTickets);
      if (bIds.length) await db.from("bookings").update({ status: "cancelled" } as any).in("id", bIds);
      if (sIds.length) await db.from("slot_bookings").update({ status: "cancelled" }).in("id", sIds);
      if (tIds.length) await db.from("race_tickets").update({ status: "cancelled" }).in("id", tIds);

      await db.from("friendships").delete().or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
      await db.from("follows").delete().or(`user_id.eq.${uid},organiser_id.eq.${uid}`);
      await db.from("notifications").delete().eq("user_id", uid);
      await db.from("event_ratings").delete().eq("user_id", uid);

      // Booking records are kept 7 years for tax — anonymise the personal fields.
      const PLACEHOLDER = "deleted-user@majorkaracing.com";
      await db.from("bookings").update({ attendee_name: "Deleted user", attendee_email: PLACEHOLDER, attendee_phone: null }).eq("user_id", uid);
      await db.from("slot_bookings").update({ attendee_name: "Deleted user", attendee_email: PLACEHOLDER, attendee_phone: null }).eq("user_id", uid);
      await db.from("race_tickets").update({ holder_name: "Deleted user", email: PLACEHOLDER, phone: null }).eq("user_id", uid);

      const { data: files } = await db.storage.from("avatars").list(uid, { limit: 100 });
      if (files?.length) await db.storage.from("avatars").remove(files.map((f) => `${uid}/${f.name}`));

      await db.from("profiles").delete().eq("id", uid);
      const { error } = await db.auth.admin.deleteUser(uid);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      console.error("[delete-account]", e?.message ?? e);
      return { ok: false, reason: "failed", message: e?.message ?? "error" };
    }
  });
