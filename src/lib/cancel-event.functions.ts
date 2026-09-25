import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export const cancelEventWithNotifications = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      eventId: z.string().uuid(),
      accessToken: z.string().min(1),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabasePublishableKey) {
        return { ok: false as const, error: "Authentication is not configured" };
      }

      const userClient = createClient<Database>(supabaseUrl, supabasePublishableKey, {
        global: {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(data.accessToken);
      const userId = claimsData?.claims?.sub;

      if (claimsError || !userId) {
        return { ok: false as const, error: "Please log in again" };
      }

      const { data: ev, error: evErr } = await supabaseAdmin
        .from("events").select("id,title,organiser_id").eq("id", data.eventId).maybeSingle();
      if (evErr || !ev) return { ok: false as const, error: "Event not found" };
      if (ev.organiser_id !== userId) return { ok: false as const, error: "Not authorised" };

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
      return { ok: true as const, count: confirmed?.length ?? 0, error: null };
    } catch (e: any) {
      console.error("cancelEventWithNotifications error:", e);
      return { ok: false as const, error: e?.message ?? "Unknown error" };
    }
  });
