import { createFileRoute } from "@tanstack/react-router";

// Called hourly by the scheduled job. Sends 24 h reminders; idempotent via bookings.reminder_sent_at.
export const Route = createFileRoute("/api/public/cron/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? "";
        const expected = [process.env["SUPABASE_PUBLISHABLE_KEY"], process.env["SUPABASE_ANON_KEY"], import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY]
          .filter(Boolean);
        if (!key || !expected.includes(key)) return new Response("Unauthorized", { status: 401 });
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
