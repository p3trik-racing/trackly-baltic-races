// Public endpoint — returns booking counts grouped by week for the last 8 weeks.
// No auth required (verify_jwt = false in supabase/config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns the Monday (UTC) of the week containing `d`, as YYYY-MM-DD.
function mondayOf(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Build the last 8 week buckets (Mondays), oldest first.
    const now = new Date();
    const currentMonday = mondayOf(now);
    const weeks: string[] = [];
    const start = new Date(currentMonday + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() - 7 * 7); // 8 weeks total including current
    for (let i = 0; i < 8; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i * 7);
      weeks.push(d.toISOString().slice(0, 10));
    }

    const sinceIso = new Date(weeks[0] + "T00:00:00Z").toISOString();

    const { data, error } = await admin
      .from("bookings")
      .select("created_at")
      .gte("created_at", sinceIso);

    if (error) throw error;

    const counts = new Map<string, number>(weeks.map((w) => [w, 0]));
    for (const row of data ?? []) {
      const wk = mondayOf(new Date(row.created_at as string));
      if (counts.has(wk)) counts.set(wk, (counts.get(wk) ?? 0) + 1);
    }

    const body = weeks.map((week) => ({ week, count: counts.get(week) ?? 0 }));

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
