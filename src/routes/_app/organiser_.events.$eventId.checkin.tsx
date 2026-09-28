import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, Search } from "lucide-react";
import { useLang } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useOrganiserGuard } from "@/lib/roles";
import { checkIn, hhmm, parseScan, type CheckInResult } from "@/lib/checkin";
import { MessageAttendees } from "@/components/MessageAttendees";

export const Route = createFileRoute("/_app/organiser_/events/$eventId/checkin")({
  head: () => ({ meta: [
    { title: "Event check-in — Majorka Racing" },
    { name: "description", content: "Scan passes and check in attendees at the track." },
    { property: "og:title", content: "Event check-in — Majorka Racing" },
    { property: "og:description", content: "Scan passes and check in attendees at the track." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CheckInDesk,
});

interface Row {
  id: string;
  attendee_name: string;
  attendee_phone: string | null;
  ticket_count: number;
  check_in_code: string;
  checked_in_at: string | null;
  no_show: boolean;
}

const SCANNER_ID = "mr-qr-scanner";

function CheckInDesk() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  useOrganiserGuard(t("organiser.notAllowed"));
  const [event, setEvent] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState(false);
  const [overlay, setOverlay] = useState<CheckInResult | null>(null);
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);
  const scannerRef = useRef<any>(null);
  const lastScan = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("bookings")
      .select("id,attendee_name,attendee_phone,ticket_count,check_in_code,checked_in_at,no_show")
      .eq("event_id", eventId).eq("status", "confirmed").order("attendee_name");
    setRows((data as any) ?? []);
  }, [eventId]);

  useEffect(() => {
    supabase.from("events").select("id,title,date").eq("id", eventId).maybeSingle().then(({ data }) => setEvent(data));
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [eventId, load]);

  function showResult(r: CheckInResult) {
    if (r.ok) {
      try { navigator.vibrate?.(100); } catch {}
      setOverlay(r);
      setTimeout(() => setOverlay((o) => (o === r ? null : o)), 3500);
    } else if (r.error === "not_found") toast.error(t("checkin.invalid"));
    else if (r.error === "booking_cancelled") toast.error(t("checkin.cancelled"));
    else toast.error(t("checkin.error"));
    load();
  }

  const onDecode = useCallback(async (text: string) => {
    const now = Date.now();
    if (lastScan.current.text === text && now - lastScan.current.at < 3000) return;
    lastScan.current = { text, at: now };
    const p = parseScan(text);
    if (p.bookingId) showResult(await checkIn({ bookingId: p.bookingId, code: p.code }));
    else if (p.code) showResult(await checkIn({ code: p.code, eventId }));
    else toast.error(t("checkin.invalid"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function stopScan() {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) { try { await s.stop(); await s.clear(); } catch {} }
  }

  async function startScan() {
    setCamError(false);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await new Promise((r) => setTimeout(r, 50));
      const s = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } },
        (text: string) => { onDecode(text); }, () => {});
    } catch {
      setCamError(true);
      await stopScan();
    }
  }

  useEffect(() => () => { const s = scannerRef.current; if (s) { s.stop().catch(() => {}); } }, []);

  async function submitCode() {
    const c = code.trim().toUpperCase();
    if (c.length !== 8) return;
    showResult(await checkIn({ code: c, eventId }));
    setCode("");
  }

  async function undo(id: string) {
    const { error } = await supabase.rpc("undo_check_in", { _booking_id: id });
    if (error) return toast.error(error.message);
    toast.success(t("checkin.undone"));
    setOverlay(null);
    load();
  }

  async function closeCheckIn() {
    if (!confirm(t("checkin.closeConfirm"))) return;
    const { data, error } = await supabase.rpc("close_check_in", { _event_id: eventId });
    if (error) return toast.error(error.message);
    toast.success(t("checkin.closed", { count: Number(data ?? 0) }));
    load();
  }

  const totalSpots = rows.reduce((s, r) => s + (r.ticket_count ?? 1), 0);
  const doneSpots = rows.filter((r) => r.checked_in_at).reduce((s, r) => s + (r.ticket_count ?? 1), 0);
  const filtered = rows.filter((r) => r.attendee_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="container-app py-6 space-y-4">
      <button onClick={() => navigate({ to: "/organiser" })} className="inline-flex items-center gap-2 text-muted-foreground">
        <ArrowLeft size={18} /> {t("common.back")}
      </button>
      <div>
        <h1 className="text-[22px] font-semibold leading-tight">{t("checkin.title")}</h1>
        {event && <p className="text-sm text-muted-foreground">{event.title}</p>}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 text-center">
        <p className="text-3xl font-semibold">{t("checkin.counter", { done: doneSpots, total: totalSpots })}</p>
      </div>

      {overlay && (
        <div className="rounded-2xl p-5 text-center space-y-2"
          style={{ backgroundColor: overlay.already ? "oklch(0.68 0.16 70)" : "oklch(0.55 0.16 145)", color: "#fff" }}>
          {overlay.already && <p className="font-semibold">{t("checkin.already", { time: hhmm(overlay.checked_in_at) })}</p>}
          <p className="text-xl font-semibold">{t("checkin.ok", { name: overlay.name ?? "" })}</p>
          <p>{t("checkin.spots", { count: overlay.spots ?? 1 })}</p>
          {overlay.booking_id && (
            <button onClick={() => undo(overlay.booking_id!)} className="text-sm underline">{t("checkin.undo")}</button>
          )}
        </div>
      )}

      {!scanning ? (
        <button onClick={startScan} className="cta-button inline-flex items-center justify-center gap-2">
          <Camera size={18} /> {t("checkin.scan")}
        </button>
      ) : (
        <button onClick={stopScan} className="w-full h-12 rounded-xl border border-border text-sm font-medium">{t("checkin.stopScan")}</button>
      )}
      <div id={SCANNER_ID} className="rounded-2xl overflow-hidden" style={{ display: scanning ? "block" : "none" }} />
      {camError && (
        <p className="text-sm rounded-xl p-3 border" style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
          {t("checkin.cameraError")}
        </p>
      )}

      <div className="flex gap-2">
        <input className="input-field font-mono tracking-widest uppercase" maxLength={8} value={code}
          placeholder={t("checkin.enterCode")}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") submitCode(); }} />
        <button onClick={submitCode} disabled={code.length !== 8}
          className="px-4 h-12 rounded-xl text-sm font-medium text-accent-foreground disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}>{t("checkin.submitCode")}</button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="input-field pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("checkin.search")} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("checkin.empty")}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const status = r.checked_in_at ? "in" : r.no_show ? "noShow" : "waiting";
            const pill = status === "in"
              ? { bg: "color-mix(in oklab, var(--success) 22%, transparent)", color: "oklch(0.78 0.16 145)" }
              : status === "noShow"
                ? { bg: "color-mix(in oklab, var(--destructive) 20%, transparent)", color: "var(--destructive)" }
                : { bg: "var(--input)", color: "var(--muted-foreground)" };
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <button className="flex-1 min-w-0 text-left" disabled={!!r.checked_in_at} onClick={() => setConfirmRow(r)}>
                  <p className="font-medium truncate">{r.attendee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("checkin.spots", { count: r.ticket_count })}
                    {r.checked_in_at ? ` · ${hhmm(r.checked_in_at)}` : ""}
                  </p>
                </button>
                {r.attendee_phone && (
                  <a href={`tel:${r.attendee_phone.replace(/\s/g, "")}`} className="text-xs text-muted-foreground">{r.attendee_phone}</a>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: pill.bg, color: pill.color }}>
                  {t(`checkin.status.${status}` as any)}
                </span>
                {r.checked_in_at && (
                  <button onClick={() => undo(r.id)} className="text-xs underline text-muted-foreground">{t("checkin.undo")}</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmRow && (
        <div className="bg-card border rounded-2xl p-4 space-y-3" style={{ borderColor: "var(--accent)" }}>
          <p className="text-sm">{t("checkin.confirmRow", { name: confirmRow.attendee_name })}</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmRow(null)} className="flex-1 h-11 rounded-xl border border-border text-sm">{t("common.cancel")}</button>
            <button onClick={async () => {
              const r = confirmRow; setConfirmRow(null);
              showResult(await checkIn({ bookingId: r.id, code: r.check_in_code }));
            }} className="flex-1 h-11 rounded-xl text-sm font-medium text-accent-foreground" style={{ backgroundColor: "var(--accent)" }}>
              {t("checkin.submitCode")}
            </button>
          </div>
        </div>
      )}

      <MessageAttendees eventId={eventId} />

      <button onClick={closeCheckIn} className="w-full h-12 rounded-xl border text-sm font-medium"
        style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
        {t("checkin.close")}
      </button>
    </main>
  );
}
