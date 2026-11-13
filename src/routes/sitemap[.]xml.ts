import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://trackly.racing";
const STATIC_PATHS = ["/", "/home", "/explore", "/tracks", "/competitions", "/calendar", "/map", "/terms", "/privacy-policy", "/event-terms"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const paths = [...STATIC_PATHS];
        const collect = async (table: "events" | "venues" | "competitions", col: "id" | "slug", prefix: string) => {
          const size = 1000;
          for (let offset = 0; ; ) {
            const { data, error } = await supabase.from(table).select(col).eq("status", "live").order("id").range(offset, offset + size - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            for (const row of data as any[]) paths.push(`${prefix}${encodeURIComponent(row[col])}`);
            offset += data.length;
          }
        };
        try {
          await collect("events", "id", "/event/");
          await collect("venues", "slug", "/tracks/");
          await collect("competitions", "slug", "/competitions/");
        } catch {
          return new Response("Sitemap unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
        }
        const urls = Array.from(new Set(paths)).map((p) => `<url><loc>${BASE_URL}${p === "/" ? "" : p}</loc></url>`).join("");
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
