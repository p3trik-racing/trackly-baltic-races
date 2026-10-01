import { createFileRoute } from "@tanstack/react-router";

// Transfers organiser / track-owner shares after the event. Idempotent via Idempotency-Key + stripe_transfer_id.
export const Route = createFileRoute("/api/public/cron/payouts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const service = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const given = request.headers.get("x-cron-secret") ?? "";
        const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        let ok = (!!secret && given === secret) || (!!service && bearer === service);
        if (!ok && given) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin.rpc("check_cron_secret", { _secret: given });
          ok = data === true;
        }
        if (!ok) return new Response("Unauthorized", { status: 401 });
        try {
          const { runPayouts } = await import("@/lib/stripe.server");
          return Response.json({ ok: true, ...(await runPayouts()) });
        } catch (e: any) {
          console.error("[cron] payouts", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
