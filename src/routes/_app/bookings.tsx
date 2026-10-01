import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLang } from "@/i18n";
import { formatDate, ucFirst } from "@/lib/format";
import { cancelCopy } from "@/lib/cancel-copy";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { eventCover } from "@/lib/event-cover";
import { Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { emailBookingCancelled } from "@/lib/app-email.functions";
import { fireAndForget } from "@/lib/access-token";
import { eur, hhmm, payLabel } from "@/lib/tracks";
import { QrPass } from "@/components/QrPass";
import { PayItem, SlotPay } from "@/components/PayItem";
import { accessToken } from "@/lib/access-token";
import { cancelRaceTicket } from "@/lib/payments.functions";
import { KindBadge, raceTicketQrUrl } from "@/components/RaceTickets";

export const Route = createFileRoute("/_app/bookings")({
  head: () => ({ meta: [
    { title: "My bookings — Majorka Racing" },
    { name: "description", content: "Review your upcoming and past motorsport event bookings." },
    { property: "og:title", content: "My bookings — Majorka Racing" },
    { property: "og:description", content: "Review your upcoming and past motorsport event bookings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BookingsPage,
});

interface BookingRow {
  id: string;
  ticket_count: number;
  total_price: number;
  platform_fee: number;
  status: string;
  events: {
    id: string;
    title: string;
    date: string;
    time: string | null;
    city: string | null;
    category: string;
    cover_image_url: string | null;
    price: number;
    deposit: number | null;
  };
}

function BookingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t: tr, lang } = useLang();
  const copyFor = (b: BookingRow) => cancelCopy(tr, { title: b.events.title, date: b.events.date, time: b.events.time, price: Number(b.events.price ?? 0), deposit: b.events.deposit, totalPaid: Number(b.total_price ?? 0), platformFee: Number(b.platform_fee ?? 0) });
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled" | "track" | "race">("upcoming");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  const [rated, setRated] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("bookings")
      .select("id,ticket_count,total_price,platform_fee,status,events(id,title,date,time,city,category,cover_image_url,price,deposit)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setBookings((data as any) ?? []));
    supabase.from("event_ratings").select("event_id").eq("user_id", user.id)
      .then(({ data }) => setRated(new Set((data ?? []).map((r: any) => r.event_id))));
  }, [user]);

  async function cancelBooking(b: BookingRow) {
    const { data, error } = await supabase.functions.invoke("cancel-booking", {
      body: { booking_id: b.id },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || tr("booking.cancelFailed"));
      return;
    }
    fireAndForget((accessToken) => emailBookingCancelled({ data: { accessToken, bookingId: b.id } }));
    setBookings((bs) => bs.map((x) => x.id === b.id ? { ...x, status: "cancelled" } : x));
    setConfirmingCancel(null);
    toast.success(copyFor(b).toast);
  }

  const today = new Date().toISOString().slice(0, 10);
  const filtered = bookings.filter((b) => {
    if (tab === "cancelled") return b.status === "cancelled";
    if (b.status === "cancelled") return false;
    return tab === "upcoming" ? b.events.date >= today : b.events.date < today;
  });

  return (
    <main className="container-app py-6 space-y-4">
      <h1 className="text-[22px] font-semibold">{tr("bookings.title")}</h1>
      <div className="flex gap-1 bg-card p-1 rounded-xl border border-border overflow-x-auto">
        {(["upcoming", "past", "cancelled", "track", "race"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex-1 h-9 px-2 rounded-lg text-sm font-medium whitespace-nowrap"
            style={{
              backgroundColor: tab === t ? "var(--accent)" : "transparent",
               color: tab === t ? "var(--accent-foreground)" : "var(--muted-foreground)",
            }}
          >
            {ucFirst(tr(`bookings.tab.${t}`))}
          </button>
        ))}
      </div>

      {tab === "track" ? <TrackBookings /> : tab === "race" ? <RaceTicketsList /> : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {tr("bookings.empty", { tab: tr(`bookings.tab.${tab}`) })}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const dt = new Date(`${b.events.date}T${b.events.time ?? "00:00"}`);
            const hoursUntil = (dt.getTime() - Date.now()) / 36e5;
             const canCancel = tab === "upcoming" && b.status === "confirmed" && hoursUntil >= 48;
            return (
              <div key={b.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <Link
                  to="/booking/$bookingId"
                  params={{ bookingId: b.id }}
                  className="flex gap-3 p-3"
                >
                  <img
                    src={eventCover(b.events.category, b.events.cover_image_url)}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-sm line-clamp-1">{b.events.title}</h3>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            b.status === "confirmed"
                              ? "color-mix(in oklab, var(--success) 20%, transparent)"
                              : "color-mix(in oklab, var(--accent) 20%, transparent)",
                          color: b.status === "confirmed" ? "var(--success)" : "var(--accent)",
                        }}
                      >
                        {b.status === "confirmed" || b.status === "cancelled" ? tr(`bookings.status.${b.status}`) : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(b.events.date, lang, "short")}</span>
                      {b.events.city && <span className="flex items-center gap-1"><MapPin size={12} />{b.events.city}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{tr("common.ref", { ref: b.id.slice(0, 8).toUpperCase() })}</div>
                  </div>
                </Link>
                {tab === "past" && b.status === "confirmed" && (
                  <div className="px-3 pb-3">
                    {rated.has(b.events.id) ? (
                      <p className="text-xs text-muted-foreground">★ {tr("rate.rated")}</p>
                    ) : (
                      <Link to="/event/$eventId" params={{ eventId: b.events.id }} search={{ rate: "1" } as any}
                        className="w-full h-9 rounded-xl text-xs font-medium inline-flex items-center justify-center"
                        style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
                        ★ {tr("rate.button")}
                      </Link>
                    )}
                  </div>
                )}
                {canCancel && confirmingCancel !== b.id && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => setConfirmingCancel(b.id)}
                      className="w-full h-10 rounded-xl border border-border text-xs font-medium text-muted-foreground"
                    >
                      {tr("bookings.cancel")}
                    </button>
                  </div>
                )}
                {canCancel && confirmingCancel === b.id && (
                  <div className="mx-3 mb-3 bg-card border border-border rounded-2xl p-4 space-y-3">
                    <p className="text-sm">
                      {copyFor(b).prompt}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmingCancel(null)}
                        className="flex-1 h-10 rounded-xl border border-border text-xs font-medium"
                      >
                        {tr("booking.keep")}
                      </button>
                      <button
                        onClick={() => cancelBooking(b)}
                        className="flex-1 h-10 rounded-xl text-xs font-medium text-accent-foreground"
                        style={{ backgroundColor: "var(--accent)" }}
                      >
                        {tr("common.yesCancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function TrackBookings() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [rows, setRows] = useState<any[] | null>(null);
  const load = () => {
    if (!user) return;
    supabase.from("slot_bookings").select("id,slot_id,kind,is_host,spots,amount,status,payment_status,pay_by,venue_slots(date,start_time,end_time,status,venues(name))")
      .eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  };
  useEffect(load, [user]);
  if (rows === null) return <p className="text-sm text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  if (!rows.length) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-sm text-muted-foreground">{t("tracks.noBookings")}</p>
      <Link to="/tracks" className="text-sm font-medium" style={{ color: "var(--accent)" }}>{t("tracks.browse")}</Link>
    </div>
  );
  return (
    <div className="space-y-3">
      {rows.map((b) => (
        <div key={b.id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
        <Link to="/track-slot/$id" params={{ id: b.slot_id }} className="block space-y-1">
          <div className="flex justify-between gap-2">
            <p className="font-medium text-sm truncate">{b.venue_slots?.venues?.name}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-input">{t(`slot.bstatus.${b.status}` as any)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(b.venue_slots?.date, lang, "short")} · {hhmm(b.venue_slots?.start_time)}–{hhmm(b.venue_slots?.end_time)}</p>
          <p className="text-xs">{t(`slot.kind.${b.kind}` as any)}{b.is_host ? ` · ${t("slot.host")}` : ""} · {t("slot.spotsN", { n: b.spots })} · {eur(b.amount)}</p>
          {b.status !== "cancelled" && <p className="text-xs text-muted-foreground">{payLabel(t, b.payment_status)}</p>}
        </Link>
        <SlotPay b={b} slotStatus={b.venue_slots?.status} onPaid={load} />
        </div>
      ))}
    </div>
  );
}

function RaceTicketsList() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [rows, setRows] = useState<any[] | null>(null);
  const [openQr, setOpenQr] = useState<string | null>(null);
  const load = () => {
    if (!user) return;
    supabase.from("race_tickets").select("*, race_ticket_types(kind,name,price,round_label,round_date,competitions(name,slug))")
      .eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  };
  useEffect(load, [user]);
  async function cancel(id: string) {
    if (!confirm(t("tickets.cancelPrompt"))) return;
    const r = await cancelRaceTicket({ data: { accessToken: (await accessToken()) ?? "", id } });
    if (!r.ok) return toast.error(r.error);
    toast.success(t("tickets.cancelled")); load();
  }
  if (rows === null) return <p className="text-sm text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  if (!rows.length) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-sm text-muted-foreground">{t("tickets.none")}</p>
      <Link to="/competitions" className="text-sm font-medium" style={{ color: "var(--accent)" }}>{t("tickets.browse")}</Link>
    </div>
  );
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const tt = r.race_ticket_types ?? {};
        const showQr = tt.kind === "spectator" && r.status === "confirmed";
        return (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-3 space-y-1.5">
            <div className="flex justify-between gap-2">
              {tt.competitions?.slug ? <Link to="/competitions/$slug" params={{ slug: tt.competitions.slug }} className="font-medium text-sm truncate">{tt.competitions?.name}</Link> : <p className="font-medium text-sm">{tt.competitions?.name}</p>}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-input h-fit">{t(`tickets.status.${r.status}` as any)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{tt.round_label}{tt.round_date ? ` · ${formatDate(tt.round_date, lang, "short")}` : ""}</p>
            <div className="flex items-center gap-2 text-xs"><KindBadge kind={tt.kind} /><span>{tt.name} · ×{r.quantity}</span></div>
            {r.status !== "cancelled" && <p className="text-xs text-muted-foreground">{Number(tt.price) > 0 ? payLabel(tr(t), r.payment_status) : t("slot.free")}</p>}
            {r.status !== "cancelled" && r.payment_status === "pending" && Number(r.amount) > 0 && (tt.kind === "spectator" || r.status === "confirmed") && (
              <PayItem kind="ticket" id={r.id} label={tt.kind === "racer" ? t("pay.entryFee", { total: eur(Math.round(Number(r.amount) * 105) / 100) }) : t("pay.payAmount", { total: eur(Math.round(Number(r.amount) * 105) / 100) })} onPaid={load} />
            )}
            {tt.kind === "racer" && r.status === "reserved" && r.payment_status === "pending" && Number(r.amount) > 0 && <p className="text-xs text-muted-foreground">{t("pay.afterConfirm")}</p>}
            {showQr && (openQr === r.id ? <QrPass bookingId={r.id} code={r.check_in_code} checkedInAt={r.checked_in_at} url={raceTicketQrUrl(r.check_in_code)} />
              : <button onClick={() => setOpenQr(r.id)} className="text-xs font-medium" style={{ color: "var(--accent)" }}>{t("tickets.showQr")}</button>)}
            {r.status !== "cancelled" && !r.checked_in_at && (
              <button onClick={() => cancel(r.id)} className="w-full h-9 rounded-xl border border-border text-xs text-muted-foreground">{t("tickets.cancel")}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
const tr = (t: any) => t;
