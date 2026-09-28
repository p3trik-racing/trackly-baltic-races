import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Sends organiser-application emails via Resend (replaces a send-organiser-email edge function).
export const sendOrganiserEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      type: z.enum(["new_application", "approved", "rejected"]),
      application_id: z.string().uuid(),
      accessToken: z.string().min(1),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const url = process.env.SUPABASE_URL;
      const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !pub) return { ok: false, error: "Auth not configured" };
      const userClient = createClient<Database>(url, pub, {
        global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data: u, error: uErr } = await userClient.auth.getUser(data.accessToken);
      if (uErr || !u?.user) return { ok: false, error: "Unauthorized" };
      const userId = u.user.id;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: app } = await supabaseAdmin.from("organiser_applications").select("*").eq("id", data.application_id).maybeSingle();
      if (!app) return { ok: false, error: "Application not found" };

      if (data.type === "new_application") {
        if (app.user_id !== userId) return { ok: false, error: "Forbidden" };
      } else {
        const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (!isAdmin) return { ok: false, error: "Forbidden" };
      }

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return { ok: false, skipped: "resend_not_configured" };

      const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
      let to: string, subject: string, body: string;
      if (data.type === "new_application") {
        to = "admin@majorkariga.com";
        subject = `New organiser application — ${app.full_name}${app.company ? ` (${app.company})` : ""}`;
        const rows: [string, unknown][] = [
          ["Name", app.full_name], ["Email", app.email], ["Phone", app.phone], ["Type", app.organiser_type],
          ["Company", app.company], ["Reg. no.", app.registration_no], ["Country", app.country], ["City", app.city],
          ["Venues", app.venues], ["Event types", (app.event_types ?? []).join(", ")], ["Events / year", app.events_per_year],
          ["Website", app.website], ["Socials", app.socials], ["Experience", app.experience], ["Message", app.message],
        ];
        body = rows.filter(([, v]) => v).map(([k, v]) =>
          `<p style="font-size:12px;color:#9A958C;margin:12px 0 2px;">${k}</p><p style="font-size:14px;color:#F5F2EC;margin:0;white-space:pre-wrap;">${esc(v)}</p>`).join("")
          + `<p style="margin:24px 0 0;"><a href="https://majorkaracing.com/admin" style="color:#C9B48C;">Review in admin panel →</a></p>`;
      } else if (data.type === "approved") {
        to = app.email;
        subject = "You're approved as a Majorka Racing organiser";
        body = `<p style="font-size:14px;color:#F5F2EC;line-height:1.6;">You're approved as a Majorka Racing organiser. Open majorkaracing.com → Organiser to post your events. You set your own prices, spots and rules. Majorka Special events stay Majorka-only.</p>`;
      } else {
        to = app.email;
        subject = "Your Majorka Racing organiser application";
        body = `<p style="font-size:14px;color:#F5F2EC;line-height:1.6;">Thanks for applying. We can't approve your organiser account right now.</p>`
          + (app.admin_note ? `<p style="font-size:14px;color:#9A958C;line-height:1.6;">${esc(app.admin_note)}</p>` : "");
      }

      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F5F2EC;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#151515;border-radius:16px;padding:32px;"><tr><td>
<h1 style="color:#C9B48C;font-size:28px;margin:0 0 24px;font-weight:700;letter-spacing:-0.5px;">Majorka Racing</h1>
${body}
<p style="font-size:12px;color:#9A958C;margin:24px 0 0;">Questions? admin@majorkariga.com</p>
</td></tr></table></td></tr></table></body></html>`;

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Majorka Racing <noreply@majorkariga.com>", to: [to], subject, html }),
      });
      if (!r.ok) { console.error("Resend failed", await r.text()); return { ok: false, error: "Email failed" }; }
      return { ok: true };
    } catch (e) {
      console.error(e);
      return { ok: false, error: "Email failed" };
    }
  });
