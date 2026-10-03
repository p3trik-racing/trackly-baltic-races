import { createFileRoute, Link } from "@tanstack/react-router";
import { CompeteBanner } from "@/components/CompeteBanner";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { EventCard, type EventCardData } from "@/components/EventCard";
import { SPECIAL, orderCategories, orderEvents } from "@/lib/categories";
import { Loader2, Search, Users } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useRoles } from "@/lib/roles";
import { ViewToggle } from "@/components/ViewToggle";
import { loadVenueCards, VenueCardView, type VenueCard } from "@/components/VenueCard";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [
    { title: "Home — Majorka Racing" },
    { name: "description", content: "Drive it where it belongs. — track days, drift and ice driving across Latvia, Estonia and Lithuania. Book your spot." },
    { property: "og:title", content: "Home — Majorka Racing" },
    { property: "og:description", content: "Drive it where it belongs. — track days, drift and ice driving across Latvia, Estonia and Lithuania. Book your spot." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const roles = useRoles();
  const [category, setCategory] = useState<string>("all");
  const [venues, setVenues] = useState<VenueCard[]>([]);
  useEffect(() => { loadVenueCards(8).then(setVenues); }, []);
  const [query, setQuery] = useState("");
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const fetchEvents = () =>
    supabase
      .from("events")
      .select("id,title,category,date,city,country,price,currency,cover_image_url,featured")
      .eq("status", "live")
      .order("date", { ascending: true })
      .then(({ data }) => setEvents((data as any) ?? []));

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
      .then(({ data }) => setFavourites(((data?.favourite_categories ?? []) as string[]).filter((c) => c !== SPECIAL)));
  }, [user]);

  const orderedCategories = useMemo(() => orderCategories(favourites), [favourites]);

  const filtered = events.filter((e) => !query || e.title.toLowerCase().includes(query.toLowerCase()));
  const featured = orderEvents(filtered.filter((e: any) => e.featured), category, favourites).slice(0, 4);
  const recent = orderEvents(filtered, category, favourites);

  return (
    <main
      className="container-app py-6 space-y-6"
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
      <header className="flex items-center gap-2">
        <LogoMark className="h-7 w-auto text-foreground shrink-0" />
        <p className="text-sm text-muted-foreground truncate min-w-0 flex-1">{t("home.tagline")}</p>
        {roles.isAdmin ? (
          <Link to="/admin" className="shrink-0 px-2.5 h-6 inline-flex items-center rounded-full text-[11px] font-medium"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>{t("role.admin")}</Link>
        ) : roles.isOrganiser ? (
          <Link to="/organiser" className="shrink-0 px-2.5 h-6 inline-flex items-center rounded-full text-[11px] font-medium border border-foreground/40 text-foreground">{t("role.organiser")}</Link>
        ) : null}
        {user && (
          <Link to="/friends" aria-label={t("friends.title")} className="shrink-0 w-8 h-8 rounded-full border border-border inline-flex items-center justify-center">
            <Users size={15} />
          </Link>
        )}
      </header>

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

      <div
        data-scroll-x
        className="-mx-5 px-5 overflow-x-auto scrollbar-hide py-3"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none", backgroundColor: "var(--background)" }}
      >
        <div className="flex gap-2 w-max pr-5">
          {[{ value: "all", label: t("common.all") }, ...orderedCategories.map((c) => ({ value: c.value, label: catLabel(t, c.value) }))].map((c) => {
            const active = category === c.value;
            const isFav = favourites.includes(c.value);
            const isSpecial = c.value === SPECIAL;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="px-4 h-9 rounded-full text-sm font-medium border transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--accent)"
                     : isSpecial
                       ? "color-mix(in oklab, var(--accent) 22%, var(--card))"
                    : isFav
                      ? "color-mix(in oklab, var(--accent) 14%, var(--card))"
                      : "var(--card)",
                   color: active ? "var(--accent-foreground)" : "var(--foreground)",
                  borderColor: active || isFav || isSpecial ? "var(--accent)" : "var(--border)",
                }}
              >
                {isSpecial ? `★ ${c.label}` : c.label}
              </button>
            );
          })}
        </div>
      </div>

      {category !== "races" && <CompeteBanner />}

      {venues.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("tracks.homeRow")}</h2>
            <Link to="/tracks" className="text-sm" style={{ color: "var(--accent)" }}>{t("tracks.seeAll")}</Link>
          </div>
          <div data-scroll-x className="-mx-5 px-5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-3 w-max pr-5">{venues.map((v) => <VenueCardView key={v.id} v={v} compact />)}</div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("home.featured")}</h2>
          <div
            data-scroll-x
            className="-mx-5 px-5 overflow-x-auto scrollbar-hide py-3"
            style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none", backgroundColor: "var(--background)" }}
          >
            <div className="flex gap-3 w-max pr-5">
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
        <h2 className="text-base font-semibold">
          {category === "all" ? t("home.upcoming") : t("home.upcomingIn", { category: catLabel(t, category) })}
        </h2>
        {recent.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm text-muted-foreground">{t("home.noMatch")}</p>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                {t("home.clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {category === "races" && <CompeteBanner />}
            {recent.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      {!user && (
        <div className="fixed bottom-20 left-0 right-0 px-4">
          <div className="container-app bg-card border border-border rounded-xl py-2.5 px-4 text-xs flex items-center justify-between shadow-lg">
            <span className="text-muted-foreground">{t("home.guestBanner")}</span>
            <Link to="/signup" className="font-semibold" style={{ color: "var(--accent)" }}>{t("common.signUp")}</Link>
          </div>
        </div>
      )}
    </main>
  );
}
