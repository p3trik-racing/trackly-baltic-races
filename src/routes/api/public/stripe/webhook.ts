import { createFileRoute } from "@tanstack/react-router";

// Stripe webhook — safety net on top of the client-side payment confirmation.
async function verify(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p[0] !== "v1"));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts["t"]);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => {
    if (s.length !== hex.length) return false;
    let diff = 0;
    for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ hex.charCodeAt(i);
    return diff === 0;
  });
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) { console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set"); return new Response("Not configured", { status: 503 }); }
        const raw = await request.text();
        const sig = request.headers.get("stripe-signature") ?? "";
        if (!(await verify(raw, sig, secret))) return new Response("Invalid signature", { status: 400 });
        let event: any;
        try { event = JSON.parse(raw); } catch { return new Response("Bad payload", { status: 400 }); }
        const live = (process.env["STRIPE_SECRET_KEY"] ?? "").startsWith("sk_live");
        if (!!event.livemode !== live) return new Response("ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("stripe_webhook_events" as any).insert({ id: event.id, type: event.type, livemode: !!event.livemode, account: event.account ?? null });
        if (error) {
          if (error.code === "23505") return new Response("duplicate", { status: 200 });
          console.error("[stripe-webhook] dedupe insert", error.message);
          return new Response("error", { status: 500 });
        }
        try {
          const { handleStripeEvent } = await import("@/lib/stripe-webhook.server");
          await handleStripeEvent(event);
          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("[stripe-webhook]", event.type, e?.message ?? e);
          // Let Stripe retry: remove the dedupe row.
          await supabaseAdmin.from("stripe_webhook_events" as any).delete().eq("id", event.id);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
