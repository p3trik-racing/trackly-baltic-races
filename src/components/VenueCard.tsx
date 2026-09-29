import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n";
import { countryLabel } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { eventCover } from "@/lib/event-cover";
import { eur } from "@/lib/tracks";

export interface VenueCard { id: string; slug: string; name: string; city: string | null; country: string; cover_image_url: string | null; from: number | null; next: string | null }

export async function loadVenueCards(limit?: number): Promise<VenueCard[]> {
  let q = supabase.from("venues").select("id,slug,name,city,country,cover_image_url").eq("status", "live").order("name");
  if (limit) q = q.limit(limit);
  const { data: vs } = await q;
  const list = vs ?? [];
  if (!list.length) return [];
  const ids = list.map((v) => v.id);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: rules }, { data: slots }] = await Promise.all([
    supabase.from("venue_price_rules").select("venue_id,price_per_hour").in("venue_id", ids),
    supabase.from("venue_slots").select("venue_id,date,status").in("venue_id", ids).gte("date", today).in("status", ["open", "split_open"]).order("date"),
  ]);
  return list.map((v) => {
    const pr = (rules ?? []).filter((r) => r.venue_id === v.id).map((r) => Number(r.price_per_hour));
    return { ...v, from: pr.length ? Math.min(...pr) : null, next: (slots ?? []).find((s) => s.venue_id === v.id)?.date ?? null };
  });
}

export function VenueCardView({ v, compact }: { v: VenueCard; compact?: boolean }) {
  const { t, lang } = useLang();
  return (
    <Link to="/tracks/$slug" params={{ slug: v.slug }} className={`block bg-card border border-border rounded-2xl overflow-hidden ${compact ? "w-64" : ""}`}>
      <img src={eventCover("track_days", v.cover_image_url)} alt="" className="w-full h-32 object-cover" />
      <div className="p-3 space-y-0.5">
        <p className="font-medium truncate">{v.name}</p>
        <p className="text-xs text-muted-foreground">{[v.city, countryLabel(v.country)].filter(Boolean).join(" · ")}</p>
        <p className="text-xs">
          {v.from != null && <span className="font-medium">{t("tracks.fromPerHour", { price: eur(v.from) })}</span>}
          {v.next && <span className="text-muted-foreground">{v.from != null ? " · " : ""}{t("tracks.nextOpen", { date: formatDate(v.next, lang, "short") })}</span>}
        </p>
      </div>
    </Link>
  );
}

