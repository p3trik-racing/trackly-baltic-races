import { createFileRoute } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { EventCard, type EventCardData } from "@/components/EventCard";
import { CATEGORIES } from "@/lib/categories";
import { ViewToggle } from "@/components/ViewToggle";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/_app/explore")({
  head: () => ({ meta: [
    { title: "Explore events — Majorka Racing" },
    { name: "description", content: "Search and filter motorsport events and track days across the Baltics." },
    { property: "og:title", content: "Explore events — Majorka Racing" },
    { property: "og:description", content: "Search and filter motorsport events and track days across the Baltics." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ExplorePage,
});

type SortKey = "soonest" | "newest" | "price_asc" | "price_desc";

function ExplorePage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [favourites, setFavourites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("soonest");
  const [showFilters, setShowFilters] = useState(false);
  const [country, setCountry] = useState("all");
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const fetchEvents = () =>
    supabase
      .from("events")
      .select("id,title,category,date,city,country,price,currency,cover_image_url,created_at,capacity")
      .eq("status", "live")
      .then(async ({ data }) => {
        const list = (data as any) ?? [];
        setEvents(list);
        if (list.length) {
          const ids = list.map((e: any) => e.id);
          const { data: bks } = await supabase
            .from("bookings").select("event_id,ticket_count,status").in("event_id", ids);
          const counts: Record<string, number> = {};
          (bks ?? []).forEach((b: any) => {
            if (b.status === "cancelled") return;
            counts[b.event_id] = (counts[b.event_id] ?? 0) + (b.ticket_count ?? 1);
          });
          setBookingCounts(counts);
        }
      });

  useEffect(() => { fetchEvents(); }, []);

  function onTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('[data-scroll-x]')) return;
    if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return;
    const d = e.touches[0].clientY - startY.current;
    if (d > 0) setPullDist(Math.min(d, 100));
  }
  async function onTouchEnd() {
    if (pullDist > 60) {
      setRefreshing(true);
      await fetchEvents();
      setRefreshing(false);
    }
    setPullDist(0);
    startY.current = null;
  }

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("favourite_categories").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        const favs = (data?.favourite_categories ?? []) as string[];
        setFavourites(favs);
        if (favs.length === 1) setCategory(favs[0]);
      });
  }, [user]);

  const countries = useMemo(
    () => Array.from(new Set(events.map((e) => e.country).filter(Boolean))) as string[],
    [events],
  );

  const orderedCategories = useMemo(() => {
    if (!favourites.length) return CATEGORIES;
    const fav = CATEGORIES.filter((c) => favourites.includes(c.value));
    const rest = CATEGORIES.filter((c) => !favourites.includes(c.value));
    return [...fav, ...rest];
  }, [favourites]);

  const filtered = useMemo(() => {
    let list = events.filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (country === "all" || e.country === country) &&
        (!query || e.title.toLowerCase().includes(query.toLowerCase())),
    );
    if (sort === "soonest") list = list.sort((a, b) => a.date.localeCompare(b.date));
    else if (sort === "price_asc") list = list.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list = list.sort((a, b) => b.price - a.price);
    else list = list.sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return list.map((e) => ({ ...e, bookings_count: bookingCounts[e.id] ?? 0 }));
  }, [events, category, country, query, sort, bookingCounts]);

  return (
    <main
      className="container-app py-6 space-y-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: pullDist ? `translateY(${pullDist / 2}px)` : undefined, transition: pullDist ? "none" : "transform 0.2s" }}
    >
      {(pullDist > 20 || refreshing) && (
        <div className="flex justify-center -mt-2">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      )}
      <h1 className="text-[22px] font-semibold">{t("explore.title")}</h1>
      <ViewToggle />

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="input-field pl-11"
          placeholder={t("home.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <SlidersHorizontal size={16} /> {t("explore.filters")}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="input-field h-9 w-auto px-3 text-sm"
        >
          <option value="soonest">{t("explore.sort.soonest")}</option>
          <option value="newest">{t("explore.sort.newest")}</option>
          <option value="price_asc">{t("explore.sort.priceAsc")}</option>
          <option value="price_desc">{t("explore.sort.priceDesc")}</option>
        </select>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">{t("explore.category")}</label>
            <select className="input-field mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">{t("common.all")}</option>
              {orderedCategories.map((c) => <option key={c.value} value={c.value}>{catLabel(t, c.value)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("explore.country")}</label>
            <select className="input-field mt-1" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">{t("common.all")}</option>
              {countries.map((c) => <option key={c} value={c}>{countryName(t, c)}</option>)}
            </select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          {t("home.noMatch")}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </main>
  );
}
