import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventCard, type EventCardData } from "@/components/EventCard";
import { CATEGORIES } from "@/lib/categories";
import { Search, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/_app/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"soonest" | "newest" | "price">("soonest");
  const [showFilters, setShowFilters] = useState(false);
  const [country, setCountry] = useState("all");

  useEffect(() => {
    supabase
      .from("events")
      .select("id,title,category,date,city,country,price,currency,cover_image_url,created_at")
      .eq("status", "live")
      .then(({ data }) => setEvents((data as any) ?? []));
  }, []);

  const countries = useMemo(
    () => Array.from(new Set(events.map((e) => e.country).filter(Boolean))) as string[],
    [events],
  );

  const filtered = useMemo(() => {
    let list = events.filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (country === "all" || e.country === country) &&
        (!query || e.title.toLowerCase().includes(query.toLowerCase())),
    );
    if (sort === "soonest") list = list.sort((a, b) => a.date.localeCompare(b.date));
    else if (sort === "price") list = list.sort((a, b) => a.price - b.price);
    else list = list.sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return list;
  }, [events, category, country, query, sort]);

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
          onChange={(e) => setSort(e.target.value as any)}
          className="input-field h-9 w-auto px-3 text-sm"
        >
          <option value="soonest">Soonest</option>
          <option value="newest">Newest</option>
          <option value="price">Price: low to high</option>
        </select>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select className="input-field mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Country</label>
            <select className="input-field mt-1" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">All</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
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
