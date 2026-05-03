import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { EventCard, type EventCardData } from "@/components/EventCard";
import { CATEGORIES } from "@/lib/categories";
import { countryLabel } from "@/lib/countries";
import { Search, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/_app/explore")({
  component: ExplorePage,
});

type SortKey = "soonest" | "newest" | "price_asc" | "price_desc";

function ExplorePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [favourites, setFavourites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("soonest");
  const [showFilters, setShowFilters] = useState(false);
  const [country, setCountry] = useState("all");

  useEffect(() => {
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
  }, []);

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
    <main className="container-app py-6 space-y-4">
      <h1 className="text-[22px] font-semibold">Explore</h1>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="input-field pl-11"
          placeholder="Search events"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="input-field h-9 w-auto px-3 text-sm"
        >
          <option value="soonest">Soonest</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select className="input-field mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {orderedCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Country</label>
            <select className="input-field mt-1" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">All</option>
              {countries.map((c) => <option key={c} value={c}>{countryLabel(c)}</option>)}
            </select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No events match your filters.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </main>
  );
}
