import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchUpcomingEvents, type UpcomingEvent } from "@/lib/upcoming-events";
import { ViewToggle } from "@/components/ViewToggle";
import { EventCard } from "@/components/EventCard";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [
    { title: "Events calendar — Majorka Racing" },
    { name: "description", content: "Browse upcoming Baltic motorsport events by date in a monthly calendar." },
    { property: "og:title", content: "Events calendar — Majorka Racing" },
    { property: "og:description", content: "Browse upcoming Baltic motorsport events by date in a monthly calendar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CalendarPage,
});

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

function CalendarPage() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState<"month" | "upcoming">("month");
  const [selected, setSelected] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(new Date());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { fetchUpcomingEvents().then((d) => { setEvents(d); setLoaded(true); }); }, []);

  const filtered = useMemo(() => events.filter((e) => category === "all" || e.category === category), [events, category]);
  const byDay = useMemo(() => {
    const m: Record<string, UpcomingEvent[]> = {};
    filtered.forEach((e) => { (m[e.date.slice(0, 10)] ??= []).push(e); });
    return m;
  }, [filtered]);

  useEffect(() => {
    if (!loaded || selected) return;
    const today = new Date();
    if (byDay[dayKey(today)]) { setSelected(today); return; }
    const first = Object.keys(byDay).sort()[0];
    const d = first ? parseISO(first) : today;
    setSelected(d);
    setMonth(d);
  }, [loaded, byDay, selected]);

  const dayEvents = selected ? byDay[dayKey(selected)] ?? [] : [];
  const grouped = useMemo(() => {
    const g: { label: string; items: UpcomingEvent[] }[] = [];
    filtered.forEach((e) => {
      const label = format(parseISO(e.date), "MMMM yyyy");
      const last = g[g.length - 1];
      if (last?.label === label) last.items.push(e); else g.push({ label, items: [e] });
    });
    return g;
  }, [filtered]);

  return (
    <main className="container-app py-6 space-y-5">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] font-semibold">Calendar</h1>
        <ViewToggle />
      </header>

      <div data-scroll-x className="-mx-5 px-5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2 w-max pr-5">
          {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => {
            const active = category === c.value;
            return (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className="px-4 h-9 rounded-full text-sm font-medium border"
                style={{
                  backgroundColor: active ? "var(--accent)" : "var(--card)",
                  color: active ? "var(--accent-foreground)" : "var(--foreground)",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                }}>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-full bg-card border border-border w-max">
        {(["month", "upcoming"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="px-4 h-8 rounded-full text-xs font-medium"
            style={{
              backgroundColor: mode === m ? "var(--accent)" : "transparent",
              color: mode === m ? "var(--accent-foreground)" : "var(--muted-foreground)",
            }}>
            {m === "month" ? "Month" : "Upcoming"}
          </button>
        ))}
      </div>

      {mode === "month" ? (
        <>
          <div className="bg-card border border-border rounded-2xl p-3">
            <DayPicker
              mode="single"
              weekStartsOn={1}
              showOutsideDays
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              modifiers={{ hasEvents: (d) => !!byDay[dayKey(d)] }}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-3",
                month_caption: "flex items-center justify-center h-9 relative",
                caption_label: "text-sm font-semibold",
                nav: "absolute inset-x-0 top-0 flex justify-between items-center h-9 px-1 z-10",
                button_previous: "w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted",
                button_next: "w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "flex-1 text-[11px] font-medium text-muted-foreground uppercase py-1",
                week: "flex w-full mt-1",
                day: "flex-1 aspect-square p-0.5",
                outside: "opacity-35",
                today: "font-bold",
              }}
              components={{
                Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
                DayButton: ({ day, modifiers, ...props }) => {
                  const count = byDay[dayKey(day.date)]?.length ?? 0;
                  const sel = modifiers.selected;
                  return (
                    <button {...props}
                      className="w-full h-full rounded-xl flex flex-col items-center justify-center text-sm gap-0.5"
                      style={{
                        backgroundColor: sel ? "var(--primary)" : "transparent",
                        color: sel ? "var(--primary-foreground)" : undefined,
                      }}>
                      <span>{day.date.getDate()}</span>
                      <span className="h-3 flex items-center gap-0.5 text-[9px] leading-none" style={{ color: "var(--accent)" }}>
                        {count > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />}
                        {count > 1 && count}
                      </span>
                    </button>
                  );
                },
              }}
            />
          </div>
          <section className="space-y-3">
            <h2 className="text-base font-semibold">
              {selected ? format(selected, "EEEE, d MMMM") : "Select a day"}
            </h2>
            {dayEvents.length === 0
              ? <p className="text-sm text-muted-foreground py-4">No events on this day.</p>
              : <div className="space-y-3">{dayEvents.map((e) => <EventCard key={e.id} event={e} />)}</div>}
          </section>
        </>
      ) : (
        <div className="space-y-6">
          {grouped.length === 0 && loaded && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
          {grouped.map((g) => (
            <section key={g.label} className="space-y-3">
              <h2 className="text-base font-semibold">{g.label}</h2>
              {g.items.map((e) => <EventCard key={e.id} event={e} />)}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
