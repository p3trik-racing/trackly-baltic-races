import { createFileRoute } from "@tanstack/react-router";

// Called hourly by the scheduled job. Sends 24 h reminders; idempotent via bookings.reminder_sent_at.
export const Route = createFileRoute("/api/public/cron/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const service = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const given = request.headers.get("x-cron-secret") ?? "";
        const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const ok = (!!secret && given === secret) || (!!service && bearer === service);
        if (!ok) return new Response("Unauthorized", { status: 401 });
        try {
          const { runReminders } = await import("@/lib/app-email.server");
          const sent = await runReminders();
          return Response.json({ ok: true, sent });
        } catch (e: any) {
          console.error("[cron] reminders", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
