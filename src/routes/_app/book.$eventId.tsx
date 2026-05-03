import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/book/$eventId")({
  component: BookPage,
});

function BookPage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState(1);
  const [waiver, setWaiver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => setEvent(data));
  }, [eventId]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      setForm({
        name: data?.full_name || "",
        email: data?.email || user.email || "",
        phone: data?.phone || "",
      });
    });
  }, [user]);

  if (!event) return <div className="container-app py-10 text-muted-foreground">Loading…</div>;

  const subtotal = Number(event.price) * tickets;
  const fee = +(subtotal * 0.05).toFixed(2);
  const total = +(subtotal + fee).toFixed(2);
  const payout = +(subtotal - fee + fee).toFixed(2); // organiser keeps subtotal, platform keeps fee

  async function confirm() {
    if (!user) return;
    if (!waiver) return toast.error("Please accept the liability waiver");
    if (!form.name || !form.email) return toast.error("Please fill in your details");
    setSubmitting(true);

    // NOTE: For v1 we record the booking immediately. Stripe payment hookup
    // comes in the next iteration once the user enables payments.
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        event_id: event.id,
        user_id: user.id,
        attendee_name: form.name,
        attendee_email: form.email,
        attendee_phone: form.phone,
        ticket_count: tickets,
        total_price: total,
        platform_fee: fee,
        organiser_payout: subtotal,
        waiver_accepted: true,
        status: "confirmed",
      })
      .select()
      .single();

    if (error || !data) {
      setSubmitting(false);
      return toast.error(error?.message || "Could not create booking");
    }

    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "booking_confirmed",
      message: `Your booking for ${event.title} is confirmed.`,
    });

    navigate({ to: "/booking/$bookingId", params: { bookingId: data.id } });
  }

  return (
    <main className="pb-32">
      <header className="container-app py-5">
        <button onClick={() => navigate({ to: "/event/$eventId", params: { eventId } })}
          className="inline-flex items-center gap-2 text-muted-foreground mb-4">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-[22px] font-semibold">Checkout</h1>
      </header>

      <section className="container-app space-y-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Event</p>
          <p className="font-medium">{event.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Attendee details</label>
          <input className="input-field" placeholder="Full name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-field" placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input-field" placeholder="Phone" type="tel" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium">Tickets</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setTickets((t) => Math.max(1, t - 1))}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center">
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-semibold">{tickets}</span>
            <button onClick={() => setTickets((t) => t + 1)}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Tickets ({tickets} × €{event.price})</span><span>€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Trackly platform fee (5%)</span><span>€{fee.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-semibold">
            <span>Total</span><span>€{total.toFixed(2)}</span>
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground bg-card border border-border rounded-2xl p-4">
          <input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)}
            className="mt-1 accent-[var(--accent)] flex-shrink-0" />
          <span>
            I accept full responsibility for my safety at this event. The event organiser is solely liable for safety on site. Trackly is a booking platform only and holds no liability.
          </span>
        </label>
      </section>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        <div className="container-app py-3">
          <button onClick={confirm} disabled={submitting} className="cta-button">
            {submitting ? "Processing…" : `Confirm & Pay €${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </main>
  );
}
