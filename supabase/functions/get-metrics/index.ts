// Public metrics endpoint — returns aggregate counts from the database.
// No auth required (verify_jwt = false in supabase/config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [profiles, events, bookings, newProfiles, newBookings] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("events").select("*", { count: "exact", head: true }),
      admin.from("bookings").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }).gt("created_at", since),
      admin.from("bookings").select("*", { count: "exact", head: true }).gt("created_at", since),
    ]);

    const body = {
      totalUsers: profiles.count ?? 0,
      totalEvents: events.count ?? 0,
      totalBookings: bookings.count ?? 0,
      newUsers30d: newProfiles.count ?? 0,
      newBookings30d: newBookings.count ?? 0,
    };

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
