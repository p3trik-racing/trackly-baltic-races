import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/i18n";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { getSlotOg } from "@/lib/og.functions";
import { sendSlotBookingEmails } from "@/lib/app-email.functions";
import { fireAndForget, accessToken } from "@/lib/access-token";
import { cancelSlotBooking } from "@/lib/payments.functions";
import { PayItem, SlotPay } from "@/components/PayItem";
import { ShareSheet } from "@/components/ShareSheet";
import { QrPass } from "@/components/QrPass";
import { SplitProgress } from "@/components/SplitProgress";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { eur, hhmm, payLabel, perSpot, slotStart, type Slot } from "@/lib/tracks";

const GENERIC = [
  { title: "Track time — Majorka Racing" },
  { name: "description", content: "Book the whole track or split the cost with other drivers." },
  { property: "og:title", content: "Track time — Majorka Racing" },
  { property: "og:description", content: "Book the whole track or split the cost with other drivers." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];

export const Route = createFileRoute("/_app/track-slot/$id")({
  validateSearch: (s) => z.object({ action: z.enum(["whole", "split", "join"]).optional() }).parse(s),
  loader: async ({ params }) => {
    try { return { og: await getSlotOg({ data: { id: params.id } }) }; } catch { return { og: null }; }
  },
  head: ({ loaderData, params }) => {
    const s = loaderData?.og;
    if (!s) return { meta: GENERIC };
    const url = `${SITE_URL}/track-slot/${params.id}`;
    const title = `${s.venues?.name ?? "Track"} · ${s.date} ${hhmm(s.start_time)} — Majorka Racing`;
    const desc = `${hhmm(s.start_time)}–${hhmm(s.end_time)} · ${eur(s.price_total)} · ${eur(perSpot(s))} per car`;
    const image = /^https:/.test(s.venues?.cover_image_url ?? "") ? s.venues.cover_image_url : `${SITE_URL}/og.png`;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { property: "og:url", content: url },
        { property: "og:site_name", content: "Majorka Racing" },
        { property: "og:image", content: image }, { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: () => <div className="container-app py-10 text-muted-foreground">Something went wrong.</div>,
  notFoundComponent: () => <div className="container-app py-10 text-muted-foreground">Not found.</div>,
  component: SlotPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

type Mode = "whole" | "split" | "join";

function SlotPage() {
  const { id } = Route.useParams();
  const { action } = Route.useSearch();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [s, setS] = useState<(Slot & { venues: any }) | null | undefined>(undefined);
  const [taken, setTaken] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [success, setSuccess] = useState<{ id: string; code: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function load() {
    const { data } = await supabase.from("venue_slots").select("*, venues(id,name,slug,city,owner_id)").eq("id", id).maybeSingle();
    setS(data as any);
    if (!data) return;
    const [{ data: n }, { data: bk }, { data: cm }] = await Promise.all([
      supabase.rpc("slot_spots_taken", { _slot_id: id }),
      supabase.from("slot_bookings").select("*").eq("slot_id", id).neq("status", "cancelled").order("created_at"),
      user ? supabase.rpc("can_manage_venue", { _venue_id: (data as any).venue_id }) : Promise.resolve({ data: false }),
    ]);
    setTaken(Number(n ?? 0));
    setBookings(bk ?? []);
    setCanManage(!!cm);
  }
  useEffect(() => { load(); }, [id, user]);
  useEffect(() => { if (action && s) setMode(action); }, [action, !!s]);

  if (s === undefined) return <main className="container-app py-10 text-muted-foreground">{t("common.loading")}</main>;
  if (!s) return <main className="container-app py-10 text-muted-foreground">{t("tracks.notFound")}</main>;

  const mine = bookings.find((b) => b.user_id === user?.id);
  const start = slotStart(s);
  const canCancel = mine && start.getTime() - Date.now() >= 48 * 36e5;
  const pps = perSpot(s);
  const shareUrl = `${SITE_URL}/track-slot/${s.id}`;
  const shareText = t("slot.shareText", { venue: s.venues?.name ?? "", date: `${formatDate(s.date, lang, "short")} ${hhmm(s.start_time)}`, pps: eur(pps) });

  function open(m: Mode) {
    if (!user) { navigate({ to: "/login" }); return; }
    setMode(m);
  }

  async function cancel() {
    if (!mine) return;
    const r = await cancelSlotBooking({ data: { accessToken: (await accessToken()) ?? "", id: mine.id } });
    setConfirmCancel(false);
    if (!r.ok) return toast.error(r.error);
    r.data.warnings.forEach((w) => toast.warning(w));
    const bid = mine.id;
    fireAndForget((accessToken) => sendSlotBookingEmails({ data: { accessToken, bookingId: bid, action: "cancelled" } }));
    toast.success(t("slot.cancelled"));
    load();
  }

  if (success) {
    return (
      <main className="container-app py-6 space-y-4">
        <h1 className="text-[22px] font-semibold">{t("slot.successTitle")}</h1>
        <p className="text-sm text-muted-foreground">{s.venues?.name} · {formatDate(s.date, lang, "weekday")} · {hhmm(s.start_time)}–{hhmm(s.end_time)}</p>
        {(() => {
          const b = bookings.find((x) => x.id === success.id);
          if (!b || b.payment_status !== "pending") return b?.payment_status === "paid" ? <p className="text-sm">{t("slot.paid")}</p> : null;
          if (b.kind === "whole") return <PayItem kind="slot" id={b.id} autoOpen payBy={b.pay_by} label={t("pay.payAmount", { total: eur(Number(b.amount) * 1.05) })} onPaid={load} />;
          return <p className="text-sm">{t("pay.whenConfirmed")}</p>;
        })()}
        <QrPass bookingId={success.id} code={success.code} url={`${SITE_URL}/track-slot/${s.id}`} />
        <button onClick={() => setShareOpen(true)} className="w-full h-12 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
          <Share2 size={16} /> {t("slot.invite")}
        </button>
        <button onClick={() => { setSuccess(null); load(); }} className="w-full h-12 rounded-xl border border-border text-sm">{t("slot.backToSlot")}</button>
        <ShareSheet open={shareOpen} onOpenChange={setShareOpen} url={shareUrl} text={shareText} title={s.venues?.name ?? ""} />
      </main>
    );
  }

  const primary = { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" };
  return (
    <main className="container-app py-6 space-y-4">
      <div className="flex items-center justify-between">
        {s.venues?.slug ? <Link to="/tracks/$slug" params={{ slug: s.venues.slug }} className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft size={18} /> {s.venues.name}</Link> : <span />}
        <button onClick={() => setShareOpen(true)} aria-label={t("share.title")} className="p-2"><Share2 size={18} /></button>
      </div>
      <div>
        <h1 className="text-[22px] font-semibold">{s.venues?.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">{formatDate(s.date, lang, "weekday")} · {hhmm(s.start_time)}–{hhmm(s.end_time)}</p>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
        <Line k={t("slot.statusLabel")} v={t(`slot.status.${s.status}` as any)} />
        <Line k={t("slot.total")} v={eur(s.price_total)} />
        <Line k={t("slot.perCar")} v={eur(pps)} />
        <Line k={t("slot.cars")} v={t("slot.carsRange", { min: s.min_cars, max: s.max_cars })} />
        {s.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{s.notes}</p>}
        {s.status === "split_open" && <SplitProgress s={s} taken={taken} />}
      </div>

      {bookings.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <h2 className="text-sm font-semibold">{t("slot.drivers")}</h2>
          {bookings.map((b) => (
            <p key={b.id} className="text-sm flex justify-between gap-2">
              <span>{canManage || b.user_id === user?.id ? b.attendee_name : b.attendee_name.split(" ")[0]}{b.is_host ? ` · ${t("slot.host")}` : ""}</span>
              <span className="text-muted-foreground">{t("slot.spotsN", { n: b.spots })}</span>
            </p>
          ))}
          {!canManage && <p className="text-[11px] text-muted-foreground">{t("slot.driversPrivate", { taken })}</p>}
        </section>
      )}

      {mine ? (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-sm space-y-1">
            <p className="font-medium">{t("slot.youreIn", { n: mine.spots })}</p>
            <p className="text-muted-foreground">{payLabel(t, mine.payment_status)}</p>
          </div>
          <SlotPay b={mine} slotStatus={s.status} onPaid={load} />
          <QrPass bookingId={mine.id} code={mine.check_in_code} url={shareUrl} />
          {canCancel && (confirmCancel ? (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-sm">{mine.is_host ? t("slot.cancelHostPrompt") : t("slot.cancelPrompt")}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(false)} className="flex-1 h-10 rounded-xl border border-border text-xs">{t("booking.keep")}</button>
                <button onClick={cancel} className="flex-1 h-10 rounded-xl text-xs font-medium" style={primary}>{t("common.yesCancel")}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmCancel(true)} className="w-full h-11 rounded-xl border border-border text-sm text-muted-foreground">{t("slot.cancelMine")}</button>
          ))}
        </div>
      ) : s.status === "open" ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => open("whole")} className="h-12 rounded-xl text-sm font-semibold" style={primary}>{t("slot.bookWhole")}</button>
          <button onClick={() => open("split")} className="h-12 rounded-xl border border-border text-sm font-medium">{t("slot.split")}</button>
        </div>
      ) : s.status === "split_open" && taken < s.max_cars ? (
        <button onClick={() => open("join")} className="w-full h-12 rounded-xl text-sm font-semibold" style={primary}>{t("slot.joinFor", { price: eur(pps) })}</button>
      ) : null}

      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} url={shareUrl} text={shareText} title={s.venues?.name ?? ""} />
      {mode && <BookSheet slot={s} mode={mode} taken={taken} onClose={() => setMode(null)} onDone={(r) => { setMode(null); setSuccess(r); load(); }} />}
    </main>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return <p className="flex justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></p>;
}

function BookSheet({ slot, mode, taken, onClose, onDone }: { slot: Slot; mode: Mode; taken: number; onClose: () => void; onDone: (r: { id: string; code: string }) => void }) {
  const { t } = useLang();
  const { user } = useAuth();
  const start = slotStart(slot);
  const defDeadline = new Date(Math.max(start.getTime() - 48 * 36e5, Date.now() + 2 * 36e5));
  const [f, setF] = useState({ name: "", email: user?.email ?? "", phone: "", cars: 1, deadline: toLocalInput(defDeadline) });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const left = slot.max_cars - taken;
  const maxCars = mode === "join" ? Math.min(3, left) : mode === "split" ? Math.max(1, slot.max_cars - 1) : slot.max_cars;

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone,email").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setF((p) => ({ ...p, name: p.name || data.full_name || "", phone: p.phone || data.phone || "", email: p.email || data.email || "" }));
    });
  }, [user]);

  async function submit() {
    if (!f.name.trim() || !f.email.trim()) return toast.error(t("slot.fillIn"));
    if (!terms) return toast.error(t("slot.acceptTerms"));
    const common = { _slot_id: slot.id, _name: f.name.trim(), _email: f.email.trim(), _phone: f.phone.trim() };
    let res;
    if (mode === "split") {
      const d = new Date(f.deadline);
      if (isNaN(d.getTime()) || d.getTime() < Date.now() + 36e5 || d.getTime() > start.getTime() - 24 * 36e5) return toast.error(t("slot.deadlineInvalid"));
      setBusy(true);
      res = await supabase.rpc("start_split", { ...common, _spots: f.cars, _deadline: d.toISOString() });
    } else {
      setBusy(true);
      res = mode === "whole"
        ? await supabase.rpc("book_slot_whole", { ...common, _cars: f.cars })
        : await supabase.rpc("join_split", { ...common, _spots: f.cars });
    }
    if (res.error) { setBusy(false); return toast.error(res.error.message); }
    const bid = res.data as unknown as string;
    fireAndForget((accessToken) => sendSlotBookingEmails({ data: { accessToken, bookingId: bid, action: "booked" } }));
    const { data: b } = await supabase.from("slot_bookings").select("check_in_code").eq("id", bid).maybeSingle();
    setBusy(false);
    onDone({ id: bid, code: b?.check_in_code ?? "" });
  }

  const title = mode === "whole" ? t("slot.bookWhole") : mode === "split" ? t("slot.split") : t("slot.join");
  const amount = mode === "whole" ? Number(slot.price_total) : perSpot(slot) * f.cars;
  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <DrawerHeader className="text-left"><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
        <div className="px-4 pb-8 space-y-3 max-h-[75vh] overflow-y-auto">
          <label className="block text-xs text-muted-foreground">{t("auth.signup.fullName")}<input className="input-field mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="block text-xs text-muted-foreground">{t("auth.email")}<input className="input-field mt-1" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label className="block text-xs text-muted-foreground">{t("auth.signup.phone")}<input className="input-field mt-1" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label className="block text-xs text-muted-foreground">{mode === "whole" ? t("slot.numCars") : t("slot.mySpots")}
            <select className="input-field mt-1" value={f.cars} onChange={(e) => setF({ ...f, cars: Number(e.target.value) })}>
              {Array.from({ length: Math.max(1, maxCars) }).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          {mode === "split" && (
            <>
              <label className="block text-xs text-muted-foreground">{t("slot.deadline")}<input className="input-field mt-1" type="datetime-local" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
              <p className="text-xs text-muted-foreground">{t("slot.splitExplain", { min: slot.min_cars })}</p>
            </>
          )}
          <p className="text-sm flex justify-between"><span>{mode === "whole" ? t("slot.total") : t("slot.yourShare")}</span><span className="font-semibold">{eur(amount)}</span></p>
          <p className="text-xs text-muted-foreground">{t("slot.paymentPending")}</p>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
            <span>{t("slot.agree")} <Link to="/event-terms" target="_blank" className="text-accent underline">{t("eventTerms.title")}</Link></span>
          </label>
          <button onClick={submit} disabled={busy} className="w-full h-12 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
            {busy ? t("common.saving") : t("slot.reserve")}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

