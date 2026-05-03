import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_app/booking/$bookingId")({
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { bookingId } = Route.useParams();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("*, events(title,date,city,organiser_name)")
      .eq("id", bookingId)
      .maybeSingle()
      .then(({ data }) => setBooking(data));
  }, [bookingId]);

  if (!booking) return <div className="container-app py-10 text-muted-foreground">Loading…</div>;

  return (
    <main className="container-app py-10 space-y-6 text-center pb-28">
      <div
        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
        style={{ backgroundColor: "color-mix(in oklab, var(--success) 25%, transparent)" }}
      >
        <Check size={36} style={{ color: "var(--success)" }} strokeWidth={3} />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Booking Confirmed!</h1>
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
          <p className="font-medium">{booking.events.title}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(booking.events.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            {booking.events.city ? ` · ${booking.events.city}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tickets</p>
          <p className="text-sm">{booking.ticket_count} × — Total €{Number(booking.total_price).toFixed(2)}</p>
        </div>
        {booking.events.organiser_name && (
          <div>
            <p className="text-xs text-muted-foreground">Organiser</p>
            <p className="text-sm">{booking.events.organiser_name}</p>
          </div>
        )}
      </div>

      <Link to="/bookings" className="cta-button">View My Bookings</Link>
    </main>
  );
}
