import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/i18n";
import { formatDate } from "@/lib/format";
import { cancelCopy } from "@/lib/cancel-copy";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { QrPass } from "@/components/QrPass";
import { emailBookingCancelled } from "@/lib/app-email.functions";
import { fireAndForget } from "@/lib/access-token";

export const Route = createFileRoute("/_app/booking/$bookingId")({
  head: () => ({ meta: [
    { title: "Booking details — Majorka Racing" },
    { name: "description", content: "View your motorsport event booking details and confirmation." },
    { property: "og:title", content: "Booking details — Majorka Racing" },
    { property: "og:description", content: "View your motorsport event booking details and confirmation." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { bookingId } = Route.useParams();
  const { t, lang } = useLang();
  const [booking, setBooking] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("id,event_id,user_id,attendee_name,attendee_email,attendee_phone,ticket_count,total_price,organiser_payout,platform_fee,status,waiver_accepted,created_at,check_in_code,checked_in_at, events(id,title,date,time,city,status,organiser_name,price,deposit)")
      .eq("id", bookingId)
      .maybeSingle()
      .then(({ data }) => setBooking(data));
  }, [bookingId]);

  if (!booking) return <div className="container-app py-10 text-muted-foreground">{t("common.loading")}</div>;

  const ev = booking.events;
  const eventDateTime = new Date(`${ev.date}T${ev.time ?? "00:00"}`);
  const now = new Date();
  const hoursUntil = (eventDateTime.getTime() - now.getTime()) / 36e5;
  const copy = cancelCopy(t, { title: ev.title, date: ev.date, time: ev.time, price: Number(ev.price ?? 0), deposit: ev.deposit, totalPaid: Number(booking.total_price ?? 0), platformFee: Number(booking.platform_fee ?? 0) });
  const price = Number(ev.price ?? 0);
  const deposit = Number(ev.deposit ?? 0);
  const isDeposit = deposit > 0 && deposit < price;
  const paid = Number(booking.total_price ?? 0).toFixed(2);
  const balance = ((price - deposit) * (booking.ticket_count ?? 1)).toFixed(2);
  const canCancel = hoursUntil >= 48 && booking.status === "confirmed";

  async function onCancel() {
    setCancelling(true);
    const { data, error } = await supabase.functions.invoke("cancel-booking", {
      body: { booking_id: booking.id },
    });
    setCancelling(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || t("booking.cancelFailed"));
      return;
    }
    fireAndForget((accessToken) => emailBookingCancelled({ data: { accessToken, bookingId: booking.id } }));
    setBooking({ ...booking, status: "cancelled" });
    setConfirmingCancel(false);
    toast.success(copy.toast);
  }

  return (
    <main className="container-app py-10 space-y-6 text-center pb-28">
      <div
        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
        style={{ backgroundColor: "color-mix(in oklab, var(--success) 25%, transparent)" }}
      >
        <Check size={36} style={{ color: "var(--success)" }} strokeWidth={3} />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">
          {booking.status === "cancelled" ? t("booking.cancelledTitle") : t("booking.confirmedTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("booking.sentTo", { email: booking.attendee_email })}
        </p>
      </div>

      {booking.status === "confirmed" && booking.check_in_code && (
        <QrPass bookingId={booking.id} code={booking.check_in_code} checkedInAt={booking.checked_in_at} />
      )}

      <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("booking.reference")}</p>
          <p className="font-mono font-semibold">{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("booking.event")}</p>
          <p className="font-medium">{ev.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(ev.date, lang, "long")}
            {ev.city ? ` · ${ev.city}` : ""}
          </p>
        </div>
        <div>
          <p className="text-sm">{t("book.spots")}: {booking.ticket_count}</p>
          <p className="text-sm text-muted-foreground">
            {price === 0 ? t("common.free")
              : isDeposit ? `${t("booking.depositPaid", { amount: paid })} · ${t("booking.balanceAtTrack", { amount: balance })}`
              : t("booking.paid", { amount: paid })}
          </p>
        </div>
        {ev.organiser_name && (
          <div>
            <p className="text-xs text-muted-foreground">{t("booking.organiser")}</p>
            <p className="text-sm">{ev.organiser_name}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Link to="/bookings" className="cta-button">{t("booking.viewMyBookings")}</Link>

        {canCancel && !confirmingCancel && (
          <button
            onClick={() => setConfirmingCancel(true)}
            disabled={cancelling}
            className="w-full h-14 rounded-xl border border-border text-sm font-medium text-muted-foreground"
          >
            {t("booking.cancel")}
          </button>
        )}

        {canCancel && confirmingCancel && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3 text-left">
            <p className="text-sm">
              {copy.prompt}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-medium"
              >
                {t("booking.keep")}
              </button>
              <button
                onClick={onCancel}
                disabled={cancelling}
                className="flex-1 h-11 rounded-xl text-sm font-medium text-accent-foreground"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {cancelling ? t("common.cancelling") : t("common.yesCancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
