// Send a booking confirmation email via Resend.
// Requires RESEND_API_KEY env var.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EN = {
  subject: "Booking Confirmed — {title}",
  greeting: "Hi {name}, your booking is confirmed!",
  there: "there",
  intro: "Here are your booking details.",
  reference: "Booking reference",
  ticket: "{count} ticket",
  tickets: "{count} tickets",
  totalPaid: "Total paid: €{total}",
  waiver: "You accepted the liability waiver at booking. You take full responsibility for your safety at this event. The event organiser is solely liable for safety on site. Majorka Racing is a booking platform only.",
  signoff: "See you at the track.",
  questions: "Questions? hello@majorkariga.com",
};
type Lang = "en" | "ru" | "lv";
// ru / lv to be filled in; missing strings fall back to EN.
const STRINGS: Record<Lang, Partial<typeof EN>> = { en: EN, ru: {}, lv: {} };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "Resend not configured" }, 500);

    const {
      attendee_email,
      attendee_name,
      event_title,
      event_date,
      event_time,
      event_location,
      ticket_count,
      total_price,
      booking_reference,
      lang: rawLang,
    } = await req.json();

    if (!attendee_email || !event_title) return json({ error: "Missing fields" }, 400);

    const lang: Lang = rawLang === "ru" || rawLang === "lv" ? rawLang : "en";
    const L = (k: keyof typeof EN, vars: Record<string, string | number> = {}) =>
      (STRINGS[lang][k] ?? EN[k]).replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m));

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F5F2EC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#151515;border-radius:16px;padding:32px;">
        <tr><td>
          <h1 style="color:#C9B48C;font-size:28px;margin:0 0 24px;font-weight:700;letter-spacing:-0.5px;">Majorka Racing</h1>
          <h2 style="font-size:20px;margin:0 0 8px;color:#F5F2EC;">${L("greeting", { name: escape(attendee_name || L("there")) })}</h2>
          <p style="color:#9A958C;font-size:14px;margin:0 0 24px;">${L("intro")}</p>

          <div style="background:#0F0F0F;border:1px solid #262626;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="font-size:12px;color:#9A958C;margin:0 0 4px;">${L("reference")}</p>
            <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:600;margin:0;color:#F5F2EC;">${escape(booking_reference || "")}</p>
          </div>

          <div style="background:#0F0F0F;border:1px solid #262626;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="font-size:16px;font-weight:600;margin:0 0 12px;color:#F5F2EC;">${escape(event_title)}</p>
            <p style="font-size:14px;color:#9A958C;margin:4px 0;">📅 ${escape(event_date || "")}${event_time ? " · " + escape(event_time) : ""}</p>
            ${event_location ? `<p style="font-size:14px;color:#9A958C;margin:4px 0;">📍 ${escape(event_location)}</p>` : ""}
            <p style="font-size:14px;color:#9A958C;margin:12px 0 4px;">${L(ticket_count > 1 ? "tickets" : "ticket", { count: ticket_count })}</p>
            <p style="font-size:16px;font-weight:600;color:#F5F2EC;margin:4px 0 0;">${L("totalPaid", { total: Number(total_price).toFixed(2) })}</p>
          </div>

          <p style="font-size:12px;color:#9A958C;line-height:1.5;margin:0 0 24px;">
            ${L("waiver")}
          </p>

          <p style="font-size:16px;color:#F5F2EC;margin:0;">${L("signoff")}</p>
          <p style="font-size:12px;color:#9A958C;margin:16px 0 0;">${L("questions")}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Majorka Racing <noreply@majorkariga.com>",
        to: [attendee_email],
        subject: L("subject", { title: event_title }),
        html,
      }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: data.message ?? "Email failed" }, 400);
    return json({ ok: true, id: data.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  function json(body: any, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  function escape(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  }
});
