import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { eventCover } from "@/lib/event-cover";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/organiser")({
  component: OrganiserDashboard,
});

interface OrgEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  city: string | null;
  country: string | null;
  status: string;
  price: number;
  cover_image_url: string | null;
}

interface BookingAgg {
  event_id: string;
  count: number;
  revenue: number;
}

function OrganiserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [aggs, setAggs] = useState<Record<string, BookingAgg>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ev } = await supabase
        .from("events").select("id,title,category,date,city,country,status,price,cover_image_url")
        .eq("organiser_id", user.id)
        .order("date", { ascending: false });
      const list = (ev as any) ?? [];
      setEvents(list);
      if (list.length) {
        const ids = list.map((e: OrgEvent) => e.id);
        const { data: bks } = await supabase
          .from("bookings").select("event_id,total_price,organiser_payout,status")
          .in("event_id", ids);
        const map: Record<string, BookingAgg> = {};
        (bks ?? []).forEach((b: any) => {
          if (b.status === "cancelled") return;
          const a = map[b.event_id] ?? { event_id: b.event_id, count: 0, revenue: 0 };
          a.count += 1;
          a.revenue += Number(b.organiser_payout ?? 0);
          map[b.event_id] = a;
        });
        setAggs(map);
      }
      setLoading(false);
    })();
  }, [user]);

  async function cancelEvent(id: string) {
    if (!confirm("Cancel this event? Attendees will see it as cancelled.")) return;
    const { error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    setEvents((es) => es.map((e) => e.id === id ? { ...e, status: "cancelled" } : e));
    toast.success("Event cancelled");
  }

  function statusBadge(e: OrgEvent) {
    const isPast = new Date(e.date) < new Date(new Date().toDateString());
    let label = e.status;
    let bg = "var(--input)";
    let color = "var(--foreground)";
    if (e.status === "cancelled") { label = "Cancelled"; bg = "color-mix(in oklab, var(--accent) 20%, transparent)"; color = "var(--accent)"; }
    else if (isPast) { label = "Past"; bg = "var(--input)"; color = "var(--muted-foreground)"; }
    else if (e.status === "live") { label = "Live"; bg = "color-mix(in oklab, var(--success) 22%, transparent)"; color = "oklch(0.78 0.16 145)"; }
    else if (e.status === "draft") { label = "Draft"; bg = "var(--input)"; color = "var(--muted-foreground)"; }
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: bg, color }}>
        {label}
      </span>
    );
  }

  return (
    <main className="container-app py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold">My Events</h1>
        <Link to="/organiser/post-event"
          className="inline-flex items-center gap-1 px-3 h-10 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: "var(--accent)" }}>
          <Plus size={16} /> Post New Event
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : events.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            You haven't posted any events yet. Post your first event to get started.
          </p>
          <Link to="/organiser/post-event" className="cta-button inline-flex">Post Event</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const agg = aggs[e.id] ?? { count: 0, revenue: 0 };
            return (
              <div key={e.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex gap-3 p-3">
                  <img src={eventCover(e.category, e.cover_image_url)}
                    alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight truncate">{e.title}</p>
                      {statusBadge(e)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {e.city ? ` · ${e.city}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agg.count} bookings · €{agg.revenue.toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 border-t border-border text-xs">
                  <Link to="/organiser/events/$eventId/bookings" params={{ eventId: e.id }}
                    className="py-3 text-center border-r border-border text-muted-foreground hover:text-foreground">
                    View Bookings
                  </Link>
                  <Link to="/organiser/post-event" search={{ edit: e.id }}
                    className="py-3 text-center border-r border-border text-muted-foreground hover:text-foreground">
                    Edit
                  </Link>
                  <button onClick={() => cancelEvent(e.id)}
                    disabled={e.status === "cancelled"}
                    className="py-3 text-center disabled:opacity-40"
                    style={{ color: "var(--accent)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
