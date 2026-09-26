import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { fetchUpcomingEvents, type UpcomingEvent } from "@/lib/upcoming-events";
import { ViewToggle } from "@/components/ViewToggle";
import { DirectionsDrawer } from "@/components/EventDrawers";
import { eventCover } from "@/lib/event-cover";
import { X } from "lucide-react";

const EventsMap = lazy(() => import("@/components/EventsMap"));

export const Route = createFileRoute("/_app/map")({
  head: () => ({ meta: [
    { title: "Events map — Majorka Racing" },
    { name: "description", content: "See upcoming track days, drift and car meets across Latvia and the Baltics on a map." },
    { property: "og:title", content: "Events map — Majorka Racing" },
    { property: "og:description", content: "See upcoming track days, drift and car meets across Latvia and the Baltics on a map." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MapPage,
});

const keyOf = (e: UpcomingEvent) => `${Number(e.location_lat).toFixed(5)},${Number(e.location_lng).toFixed(5)}`;

function MapPage() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirEvent, setDirEvent] = useState<UpcomingEvent | null>(null);

  useEffect(() => { fetchUpcomingEvents().then(setEvents); }, []);

  const selectedEvents = useMemo(
    () => (selected ? events.filter((e) => e.location_lat != null && e.location_lng != null && keyOf(e) === selected) : []),
    [events, selected],
  );

  return (
    <main className="container-app relative px-0" style={{ height: "calc(100dvh - 72px)" }}>
      <div className="absolute top-3 left-0 right-0 z-[500] flex justify-center">
        <ViewToggle className="bg-background/80 backdrop-blur rounded-full p-1" />
      </div>
      <ClientOnly fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading map…</div>}>
        <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading map…</div>}>
          <EventsMap events={events} selected={selected} onSelect={setSelected} />
        </Suspense>
      </ClientOnly>

      {selectedEvents.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] bg-card border border-border rounded-2xl shadow-xl">
          <div className="flex items-center justify-between px-4 pt-3">
            <p className="text-xs text-muted-foreground">
              {selectedEvents.length > 1 ? `${selectedEvents.length} events here` : "Event"}
            </p>
            <button aria-label="Close" onClick={() => setSelected(null)} className="text-muted-foreground"><X size={16} /></button>
          </div>
          <div className="max-h-[45dvh] overflow-y-auto p-3 space-y-3">
            {selectedEvents.map((e) => (
              <div key={e.id} className="space-y-2.5">
                <div className="flex gap-3">
                  <img src={eventCover(e.category, e.cover_image_url)} alt={e.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{e.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {e.time && ` · ${String(e.time).slice(0, 5)}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[e.location_name, e.city].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-sm font-semibold">{e.price === 0 ? "Free" : `€${e.price}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/event/$eventId" params={{ eventId: e.id }}
                    className="flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center bg-primary text-primary-foreground">
                    View event
                  </Link>
                  <button onClick={() => setDirEvent(e)}
                    className="flex-1 h-10 rounded-xl text-sm font-medium border border-border bg-background">
                    Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {dirEvent && <DirectionsDrawer event={dirEvent} open={!!dirEvent} onOpenChange={(o) => !o && setDirEvent(null)} />}
    </main>
  );
}
