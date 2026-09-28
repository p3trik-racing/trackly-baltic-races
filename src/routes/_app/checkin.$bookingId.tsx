import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLang } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { checkIn, hhmm, type CheckInResult } from "@/lib/checkin";

export const Route = createFileRoute("/_app/checkin/$bookingId")({
  validateSearch: (s: Record<string, unknown>): { c?: string } =>
    typeof s.c === "string" ? { c: s.c } : {},
  head: () => ({ meta: [
    { title: "Check-in — Majorka Racing" },
    { name: "description", content: "Check in an attendee at a Majorka Racing event." },
    { property: "og:title", content: "Check-in — Majorka Racing" },
    { property: "og:description", content: "Check in an attendee at a Majorka Racing event." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CheckInPage,
});

function CheckInPage() {
  const { bookingId } = Route.useParams();
  const { c } = Route.useSearch();
  const { user, loading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [res, setRes] = useState<CheckInResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const back = `/checkin/${bookingId}${c ? `?c=${encodeURIComponent(c)}` : ""}`;
      navigate({ to: "/login", search: { redirect: back } });
      return;
    }
    checkIn({ bookingId, code: c }).then(setRes);
  }, [user, loading, bookingId, c, navigate]);

  async function undo() {
    setBusy(true);
    const { error } = await supabase.rpc("undo_check_in", { _booking_id: bookingId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("checkin.undone"));
    setRes((r) => r ? { ...r, ok: false, already: false, error: "undone" } : r);
  }

  if (!res) return <div className="container-app py-16 text-center text-muted-foreground">{t("checkin.checking")}</div>;

  const box = (bg: string, children: React.ReactNode) => (
    <main className="container-app py-8 space-y-4">
      <div className="rounded-3xl p-8 text-center space-y-3" style={{ backgroundColor: bg, color: "#fff" }}>{children}</div>
    </main>
  );

  if (res.ok) {
    const green = "oklch(0.55 0.16 145)";
    const amber = "oklch(0.68 0.16 70)";
    return (
      <main className="container-app py-8 space-y-4">
        <div className="rounded-3xl p-8 text-center space-y-3" style={{ backgroundColor: res.already ? amber : green, color: "#fff" }}>
          {res.already ? (
            <p className="text-2xl font-semibold">{t("checkin.already", { time: hhmm(res.checked_in_at) })}</p>
          ) : null}
          <p className="text-2xl font-semibold leading-tight">
            {t("checkin.ok", { name: res.name ?? "" })}
          </p>
          <p className="text-lg">{t("checkin.spots", { count: res.spots ?? 1 })} · {res.event_title}</p>
        </div>
        <button onClick={undo} disabled={busy} className="w-full h-12 rounded-xl border border-border text-sm font-medium">
          {t("checkin.undo")}
        </button>
        {res.event_id && (
          <Link to="/organiser/events/$eventId/checkin" params={{ eventId: res.event_id }} className="cta-button">
            {t("checkin.next")}
          </Link>
        )}
      </main>
    );
  }

  if (res.error === "undone") {
    return (
      <main className="container-app py-8 space-y-4 text-center">
        <p className="text-lg">{t("checkin.undone")}</p>
        {res.event_id && (
          <Link to="/organiser/events/$eventId/checkin" params={{ eventId: res.event_id }} className="cta-button">{t("checkin.next")}</Link>
        )}
      </main>
    );
  }

  if (res.error === "not_organiser") {
    return (
      <main className="container-app py-8 space-y-4">
        <div className="rounded-3xl p-8 text-center bg-card border border-border">
          <p className="text-lg font-medium">{t("checkin.attendeePass")}</p>
        </div>
        <Link to="/booking/$bookingId" params={{ bookingId }} className="cta-button">{t("checkin.passTitle")}</Link>
      </main>
    );
  }

  const red = "oklch(0.55 0.2 25)";
  if (res.error === "not_found") return box(red, <p className="text-2xl font-semibold">{t("checkin.invalid")}</p>);
  if (res.error === "booking_cancelled") return box(red, <p className="text-2xl font-semibold">{t("checkin.cancelled")}</p>);
  return box(red, <p className="text-xl font-semibold">{t("checkin.error")}</p>);
}
