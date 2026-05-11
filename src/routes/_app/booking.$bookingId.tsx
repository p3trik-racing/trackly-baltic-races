import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/booking/$bookingId")({
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { bookingId } = Route.useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("*, events(id,title,date,time,city,status,organiser_name)")
      .eq("id", bookingId)
      .maybeSingle()
      .then(({ data }) => setBooking(data));
  }, [bookingId]);

  if (!booking) return <div className="container-app py-10 text-muted-foreground">Loading…</div>;

  const ev = booking.events;
  const eventDateTime = new Date(`${ev.date}T${ev.time ?? "00:00"}`);
  const now = new Date();
  const hoursUntil = (eventDateTime.getTime() - now.getTime()) / 36e5;
  const isFuture = eventDateTime.getTime() > now.getTime();
  const canBuyMore = isFuture && ev.status === "live" && booking.status !== "cancelled";
  const canCancel = hoursUntil > 2 && booking.status === "confirmed";

  async function onCancel() {
    setCancelling(true);
    const { data, error } = await supabase.functions.invoke("cancel-booking", {
      body: { booking_id: booking.id },
    });
    setCancelling(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Could not cancel");
      return;
    }
    setBooking({ ...booking, status: "cancelled" });
    setConfirmingCancel(false);
    toast.success("Booking cancelled. Refund is being processed.");
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
          {booking.status === "cancelled" ? "Booking Cancelled" : "Booking Confirmed!"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          A confirmation has been sent to {booking.attendee_email}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Reference</p>
          <p className="font-mono font-semibold">{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Event</p>
          <p className="font-medium">{ev.title}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(ev.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            {ev.city ? ` · ${ev.city}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tickets</p>
          <p className="text-sm">{booking.ticket_count} × — Total €{Number(booking.total_price).toFixed(2)}</p>
        </div>
        {ev.organiser_name && (
          <div>
            <p className="text-xs text-muted-foreground">Organiser</p>
            <p className="text-sm">{ev.organiser_name}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Link to="/bookings" className="cta-button">View My Bookings</Link>

        {canBuyMore && (
          <button
            onClick={() => navigate({ to: "/book/$eventId", params: { eventId: ev.id } })}
            className="w-full h-14 rounded-xl border border-border text-sm font-medium text-muted-foreground"
          >
            Buy more tickets
          </button>
        )}

        {canCancel && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="w-full h-14 rounded-xl border border-border text-sm font-medium text-muted-foreground"
          >
            {cancelling ? "Cancelling…" : "Cancel Booking"}
          </button>
        )}
      </div>
    </main>
  );
}
