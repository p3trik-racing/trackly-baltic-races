import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n";
import { countryLabel } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { eventCover } from "@/lib/event-cover";
import { eur } from "@/lib/tracks";

export const Route = createFileRoute("/_app/tracks")({
  head: () => ({ meta: [
    { title: "Book a whole track — Majorka Racing" },
    { name: "description", content: "Rent a Baltic race track by the hour — book it whole or split the cost with other drivers." },
    { property: "og:title", content: "Book a whole track — Majorka Racing" },
    { property: "og:description", content: "Rent a Baltic race track by the hour — book it whole or split the cost with other drivers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TracksPage,
});

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

function TracksPage() {
  const { t } = useLang();
  const [items, setItems] = useState<VenueCard[] | null>(null);
  useEffect(() => { loadVenueCards().then(setItems); }, []);
  return (
    <main className="container-app py-6 space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold">{t("tracks.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("tracks.subtitle")}</p>
      </div>
      {items === null ? <p className="text-sm text-muted-foreground text-center py-10">{t("common.loading")}</p>
        : items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">{t("tracks.empty")}</p>
        : <div className="grid gap-3 sm:grid-cols-2">{items.map((v) => <VenueCardView key={v.id} v={v} />)}</div>}
    </main>
  );
}
