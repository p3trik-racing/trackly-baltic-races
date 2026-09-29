import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Globe, Mail, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n";
import { countryLabel } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { eventCover } from "@/lib/event-cover";
import { SlotCalendar } from "@/components/SlotCalendar";
import { SplitProgress } from "@/components/SplitProgress";
import { daysLabel, eur, hhmm, perSpot, type PriceRule, type Slot } from "@/lib/tracks";

export const Route = createFileRoute("/_app/tracks_/$slug")({
  head: () => ({ meta: [
    { title: "Track — Majorka Racing" },
    { name: "description", content: "Track info, hourly prices and open slots — book the whole track or split it with other drivers." },
    { property: "og:title", content: "Track — Majorka Racing" },
    { property: "og:description", content: "Track info, hourly prices and open slots — book the whole track or split it with other drivers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: VenuePage,
});

function VenuePage() {
  const { slug } = Route.useParams();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [v, setV] = useState<any | null | undefined>(undefined);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [taken, setTaken] = useState<Record<string, number>>({});
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("venues").select("*").eq("slug", slug).maybeSingle();
      setV(data);
      if (!data) return;
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: r }, { data: s }] = await Promise.all([
        supabase.from("venue_price_rules").select("*").eq("venue_id", data.id).order("start_time"),
        supabase.from("venue_slots").select("*").eq("venue_id", data.id).gte("date", today).neq("status", "cancelled").order("date").order("start_time"),
      ]);
      setRules((r as any) ?? []);
      const list = (s as any as Slot[]) ?? [];
      setSlots(list);
      const first = list.find((x) => x.status === "open" || x.status === "split_open");
      if (first) setDay(first.date);
      const splits = list.filter((x) => x.status === "split_open");
      const counts = await Promise.all(splits.map((x) => supabase.rpc("slot_spots_taken", { _slot_id: x.id })));
      setTaken(Object.fromEntries(splits.map((x, i) => [x.id, Number(counts[i].data ?? 0)])));
    })();
  }, [slug]);

  const daySlots = useMemo(() => slots.filter((s) => s.date === day), [slots, day]);

  if (v === undefined) return <main className="container-app py-10 text-muted-foreground">{t("common.loading")}</main>;
  if (!v) return <main className="container-app py-10 text-muted-foreground">{t("tracks.notFound")}</main>;

  const go = (id: string, action?: "whole" | "split" | "join") => navigate({ to: "/track-slot/$id", params: { id }, search: action ? { action } : {} });

  return (
    <main className="container-app py-6 space-y-5">
      <Link to="/tracks" className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft size={18} /> {t("common.back")}</Link>
      <img src={eventCover("track_days", v.cover_image_url)} alt="" className="w-full rounded-2xl object-cover max-h-[300px]" />
      <div>
        <h1 className="text-[22px] font-semibold">{v.name}</h1>
        <p className="text-sm text-muted-foreground">{[v.location_name, v.city, countryLabel(v.country)].filter(Boolean).join(" · ")}</p>
      </div>
      {v.description && <p className="text-sm whitespace-pre-wrap">{v.description}</p>}
      {v.track_info && (
        <section className="space-y-1"><h2 className="text-base font-semibold">{t("tracks.trackInfo")}</h2><p className="text-sm whitespace-pre-wrap text-muted-foreground">{v.track_info}</p></section>
      )}
      {v.requirements?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {v.requirements.map((r: string) => <span key={r} className="rounded-full border border-border px-3 py-1.5 text-xs">{t(`req.${r}` as any) === `req.${r}` ? r : t(`req.${r}` as any)}</span>)}
        </div>
      )}
      {v.location_lat != null && v.location_lng != null && (
        <iframe title={v.name} className="w-full h-48 rounded-2xl border border-border"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${v.location_lng - 0.02},${v.location_lat - 0.01},${Number(v.location_lng) + 0.02},${Number(v.location_lat) + 0.01}&layer=mapnik&marker=${v.location_lat},${v.location_lng}`} />
      )}
      <div className="flex flex-wrap gap-3 text-sm">
        {v.location_lat != null && <a className="inline-flex items-center gap-1 text-accent" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${v.location_lat},${v.location_lng}`}><MapPin size={14} />{t("tracks.directions")}</a>}
        {v.phone && <a className="inline-flex items-center gap-1 text-accent" href={`tel:${v.phone}`}><Phone size={14} />{v.phone}</a>}
        {v.email && <a className="inline-flex items-center gap-1 text-accent" href={`mailto:${v.email}`}><Mail size={14} />{v.email}</a>}
        {v.website && <a className="inline-flex items-center gap-1 text-accent" target="_blank" rel="noopener noreferrer" href={v.website}><Globe size={14} />{t("tracks.website")}</a>}
      </div>

      {rules.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-1.5">
          <h2 className="text-base font-semibold">{t("tracks.prices")}</h2>
          {rules.map((r, i) => (
            <p key={r.id ?? i} className="text-sm flex justify-between gap-2">
              <span>{daysLabel(r.days, lang)} {hhmm(r.start_time)}–{hhmm(r.end_time)}{r.label ? <span className="text-muted-foreground"> · {r.label}</span> : null}</span>
              <span className="font-medium whitespace-nowrap">{t("tracks.perHour", { price: eur(r.price_per_hour) })}</span>
            </p>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("tracks.availability")}</h2>
        <SlotCalendar slots={slots} selected={day} onSelect={setDay} />
        {day && (
          <div className="space-y-2">
            <p className="text-sm font-medium capitalize">{formatDate(day, lang, "weekday")}</p>
            {daySlots.length === 0 ? <p className="text-sm text-muted-foreground">{t("tracks.noSlotsDay")}</p> : daySlots.map((s) => (
              <SlotRow key={s.id} s={s} taken={taken[s.id] ?? 0} onOpen={(a) => go(s.id, a)} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SlotRow({ s, taken, onOpen }: { s: Slot; taken: number; onOpen: (a?: "whole" | "split" | "join") => void }) {
  const { t } = useLang();
  const btn = "flex-1 h-10 rounded-xl text-xs font-medium";
  return (
    <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
      <button onClick={() => onOpen()} className="w-full text-left flex justify-between gap-2">
        <span>
          <span className="font-medium">{hhmm(s.start_time)}–{hhmm(s.end_time)}</span>
          <span className="block text-xs text-muted-foreground">{t("slot.carsRange", { min: s.min_cars, max: s.max_cars })}</span>
        </span>
        <span className="text-right">
          <span className="font-medium">{eur(s.price_total)}</span>
          <span className="block text-xs text-muted-foreground">{t(`slot.status.${s.status}` as any)}</span>
        </span>
      </button>
      {s.status === "open" && (
        <div className="flex gap-2">
          <button className={btn} style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }} onClick={() => onOpen("whole")}>{t("slot.bookWhole")}</button>
          <button className={`${btn} border border-border`} onClick={() => onOpen("split")}>{t("slot.split")}</button>
        </div>
      )}
      {s.status === "split_open" && (
        <>
          <SplitProgress s={s} taken={taken} />
          <button className={`${btn} w-full`} style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }} onClick={() => onOpen("join")}>{t("slot.join")}</button>
        </>
      )}
    </div>
  );
}
