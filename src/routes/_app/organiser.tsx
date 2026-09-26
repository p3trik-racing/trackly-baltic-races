import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { eventCover } from "@/lib/event-cover";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cancelEventWithNotifications } from "@/lib/cancel-event.functions";

export const Route = createFileRoute("/_app/organiser")({
  head: () => ({ meta: [
    { title: "My events — Majorka Racing" },
    { name: "description", content: "Manage your motorsport events and bookings." },
    { property: "og:title", content: "My events — Majorka Racing" },
    { property: "og:description", content: "Manage your motorsport events and bookings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
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
  const { t } = useLang();
  const tr = t;
  
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [aggs, setAggs] = useState<Record<string, BookingAgg>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
    setCancellingId(id);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error(t("organiser.loginAgain"));
      }

      const res = await cancelEventWithNotifications({ data: { eventId: id, accessToken } });
      if (!res?.ok) throw new Error(res?.error ?? t("organiser.cancelFailed"));
      setEvents((es) => es.map((e) => e.id === id ? { ...e, status: "cancelled" } : e));
      setConfirmingCancel(null);
      toast.success(t("organiser.cancelledToast"));
    } catch (e: any) {
      toast.error(e?.message ?? t("organiser.cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  }

  function statusBadge(e: OrgEvent) {
    const isPast = new Date(e.date) < new Date(new Date().toDateString());
    let label = e.status;
    let bg = "var(--input)";
    let color = "var(--foreground)";
    if (e.status === "cancelled") { label = t("organiser.status.cancelled"); bg = "color-mix(in oklab, var(--accent) 20%, transparent)"; color = "var(--accent)"; }
    else if (isPast) { label = t("organiser.status.past"); bg = "var(--input)"; color = "var(--muted-foreground)"; }
    else if (e.status === "live") { label = t("organiser.status.live"); bg = "color-mix(in oklab, var(--success) 22%, transparent)"; color = "oklch(0.78 0.16 145)"; }
    else if (e.status === "draft") { label = t("organiser.status.draft"); bg = "var(--input)"; color = "var(--muted-foreground)"; }
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: bg, color }}>
        {label}
      </span>
    );
  }

  return (
    <main className="container-app py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold">{t("organiser.title")}</h1>
        <Link to="/organiser/post-event"
          className="inline-flex items-center gap-1 px-3 h-10 rounded-xl text-sm font-medium text-accent-foreground"
          style={{ backgroundColor: "var(--accent)" }}>
          <Plus size={16} /> {t("organiser.postNew")}
        </Link>
      </div>

      <div className="flex gap-2 bg-card p-1 rounded-xl border border-border">
        {(["active", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 h-9 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: tab === t ? "var(--accent)" : "transparent",
               color: tab === t ? "var(--accent-foreground)" : "var(--muted-foreground)",
            }}>
            {t === "active" ? tr("organiser.tab.active") : tr("organiser.tab.past")}
          </button>
        ))}
      </div>

      {(() => {
        const today = new Date(new Date().toDateString());
        const filtered = events.filter((e) => {
          const isPast = new Date(e.date) < today;
          const isCancelled = e.status === "cancelled";
          return tab === "active"
            ? !isCancelled && !isPast && (e.status === "live" || e.status === "draft")
            : isCancelled || isPast;
        });
        return loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {events.length === 0
                ? t("organiser.emptyAll")
                : tab === "active" ? t("organiser.emptyActive") : t("organiser.emptyPast")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => {
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
                      {t("organiser.stats", { count: agg.count, revenue: agg.revenue.toFixed(0) })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 border-t border-border text-xs">
                  <Link to="/organiser/events/$eventId/bookings" params={{ eventId: e.id }}
                    className="py-3 text-center border-r border-border text-muted-foreground hover:text-foreground">
                    {t("organiser.viewBookings")}
                  </Link>
                  <Link to="/organiser/post-event" search={{ edit: e.id }}
                    className="py-3 text-center border-r border-border text-muted-foreground hover:text-foreground">
                    {t("common.edit")}
                  </Link>
                  <button onClick={() => setConfirmingCancel(e.id)}
                    disabled={e.status === "cancelled"}
                    className="py-3 text-center disabled:opacity-40"
                    style={{ color: "var(--accent)" }}>
                    {t("organiser.cancel")}
                  </button>
                </div>
                {confirmingCancel === e.id && (
                  <div className="m-3 bg-card border border-border rounded-2xl p-4 space-y-3">
                    <p className="text-sm">
                      {t("organiser.cancelPrompt", { title: e.title })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmingCancel(null)}
                        disabled={cancellingId === e.id}
                        className="flex-1 h-10 rounded-xl border border-border text-xs font-medium"
                      >
                        {t("organiser.keep")}
                      </button>
                      <button
                        onClick={() => cancelEvent(e.id)}
                        disabled={cancellingId === e.id}
                        className="flex-1 h-10 rounded-xl text-xs font-medium text-accent-foreground"
                        style={{ backgroundColor: "var(--accent)" }}
                      >
                        {cancellingId === e.id ? t("common.cancelling") : t("common.yesCancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
      })()}
    </main>
  );
}
