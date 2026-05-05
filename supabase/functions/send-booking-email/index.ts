// Send a booking confirmation email via Resend.
// Requires RESEND_API_KEY env var.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    } = await req.json();

    if (!attendee_email || !event_title) return json({ error: "Missing fields" }, 400);

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#262626;border-radius:16px;padding:32px;">
        <tr><td>
          <h1 style="color:#E74C3C;font-size:28px;margin:0 0 24px;font-weight:700;letter-spacing:-0.5px;">Trackly</h1>
          <h2 style="font-size:20px;margin:0 0 8px;color:#f5f5f5;">Hi ${escape(attendee_name || "there")}, your booking is confirmed!</h2>
          <p style="color:#a0a0a0;font-size:14px;margin:0 0 24px;">Here are your booking details.</p>

          <div style="background:#1a1a1a;border:1px solid #3a3a3a;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="font-size:12px;color:#a0a0a0;margin:0 0 4px;">Booking reference</p>
            <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:600;margin:0;color:#f5f5f5;">${escape(booking_reference || "")}</p>
          </div>

          <div style="background:#1a1a1a;border:1px solid #3a3a3a;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="font-size:16px;font-weight:600;margin:0 0 12px;color:#f5f5f5;">${escape(event_title)}</p>
            <p style="font-size:14px;color:#a0a0a0;margin:4px 0;">📅 ${escape(event_date || "")}${event_time ? " · " + escape(event_time) : ""}</p>
            ${event_location ? `<p style="font-size:14px;color:#a0a0a0;margin:4px 0;">📍 ${escape(event_location)}</p>` : ""}
            <p style="font-size:14px;color:#a0a0a0;margin:12px 0 4px;">${ticket_count} ticket${ticket_count > 1 ? "s" : ""}</p>
            <p style="font-size:16px;font-weight:600;color:#f5f5f5;margin:4px 0 0;">Total paid: €${Number(total_price).toFixed(2)}</p>
          </div>

          <p style="font-size:12px;color:#a0a0a0;line-height:1.5;margin:0 0 24px;">
            You accepted the liability waiver at booking. You take full responsibility for your safety at this event. The event organiser is solely liable for safety on site. Trackly is a booking platform only.
          </p>

          <p style="font-size:16px;color:#f5f5f5;margin:0;">See you at the track.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Trackly <noreply@trackly.racing>",
        to: [attendee_email],
        subject: `Booking Confirmed — ${event_title}`,
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
