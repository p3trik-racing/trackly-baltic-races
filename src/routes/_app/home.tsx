import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { EventCard, type EventCardData } from "@/components/EventCard";
import { CATEGORIES } from "@/lib/categories";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("events")
      .select("id,title,category,date,city,country,price,currency,cover_image_url,featured")
      .eq("status", "live")
      .order("date", { ascending: true })
      .then(({ data }) => setEvents((data as any) ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("favourite_categories").eq("id", user.id).maybeSingle()
      .then(({ data }) => setFavourites((data?.favourite_categories ?? []) as string[]));
  }, [user]);

  const orderedCategories = useMemo(() => {
    if (!favourites.length) return CATEGORIES;
    const fav = CATEGORIES.filter((c) => favourites.includes(c.value));
    const rest = CATEGORIES.filter((c) => !favourites.includes(c.value));
    return [...fav, ...rest];
  }, [favourites]);

  const filtered = events.filter(
    (e) =>
      (category === "all" || e.category === category) &&
      (!query || e.title.toLowerCase().includes(query.toLowerCase())),
  );
  const featured = filtered.filter((e: any) => e.featured).slice(0, 4);
  const recent = filtered;

  return (
    <main className="container-app py-6 space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold">Trackly</h1>
        <p className="text-sm text-muted-foreground">Find your next session</p>
      </header>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="input-field pl-11"
          placeholder="Search events"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="-mx-5 px-5 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {[{ value: "all", label: "All" }, ...orderedCategories].map((c) => {
            const active = category === c.value;
            const isFav = favourites.includes(c.value);
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="px-4 h-9 rounded-full text-sm font-medium border transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--accent)"
                    : isFav
                      ? "color-mix(in oklab, var(--accent) 14%, var(--card))"
                      : "var(--card)",
                  color: active ? "#fff" : "var(--foreground)",
                  borderColor: active || isFav ? "var(--accent)" : "var(--border)",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {featured.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Featured</h2>
          <div className="-mx-5 px-5 overflow-x-auto">
            <div className="flex gap-3 w-max">
              {featured.map((e) => (
                <div key={e.id} className="w-72">
                  <EventCard event={e} large />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Recently added</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No events match your filters.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
    </main>
  );
}
