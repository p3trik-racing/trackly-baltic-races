import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function anon() {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getEventOg = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { data: e } = await anon().from("events")
        .select("id,title,date,city,price,category,cover_image_url,status")
        .eq("id", data.id).eq("status", "live").maybeSingle();
      return e ?? null;
    } catch { return null; }
  });

export const getCompetitionOg = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { data: c } = await anon().from("competitions")
        .select("slug,name,season,discipline,country")
        .eq("slug", data.slug).eq("status", "live").maybeSingle();
      return c ?? null;
    } catch { return null; }
  });

export const getSlotOg = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { data: s } = await anon().from("venue_slots")
        .select("id,date,start_time,end_time,price_total,max_cars,per_spot_price,status,venues(name,city,cover_image_url)")
        .eq("id", data.id).maybeSingle();
      return (s as any) ?? null;
    } catch { return null; }
  });
