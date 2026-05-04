import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const cancelEventWithNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events").select("id,title,organiser_id").eq("id", data.eventId).maybeSingle();
    if (evErr || !ev) throw new Error("Event not found");
    if (ev.organiser_id !== userId) throw new Error("Not authorised");

    await supabaseAdmin.from("events").update({ status: "cancelled" }).eq("id", ev.id);

    const { data: confirmed } = await supabaseAdmin
      .from("bookings").select("id,user_id")
      .eq("event_id", ev.id).eq("status", "confirmed");

    if (confirmed && confirmed.length) {
      await supabaseAdmin.from("bookings").update({ status: "cancelled" })
        .eq("event_id", ev.id).eq("status", "confirmed");
      const notifs = confirmed.map((b: any) => ({
        user_id: b.user_id,
        type: "event_cancelled",
        message: `Your booking for ${ev.title} has been cancelled as the event was cancelled by the organiser.`,
      }));
      await supabaseAdmin.from("notifications").insert(notifs);
    }
    return { ok: true, count: confirmed?.length ?? 0 };
  });
