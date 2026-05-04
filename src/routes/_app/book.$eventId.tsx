import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Minus, Plus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

export const Route = createFileRoute("/_app/book/$eventId")({
  component: BookPage,
});

// NOTE: STRIPE_SECRET_KEY (edge function) and VITE_STRIPE_PUBLISHABLE_KEY
// (frontend) must be set in environment variables. Use sk_test_/pk_test_
// keys during development.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)
  : null;

type PaymentStep = "details" | "payment" | "processing";

function BookPage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState(1);
  const [waiver, setWaiver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("details");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

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

  async function continueToPayment() {
    if (!user) return;
    if (!form.name || !form.email) return toast.error("Please fill in your details");
    if (!waiver) return toast.error("Please accept the liability waiver");
    setPaymentError(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          amount: Math.round(total * 100),
          currency: (event.currency || "eur").toLowerCase(),
          event_id: event.id,
          description: `Booking: ${event.title}`,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.clientSecret) throw new Error(data?.error || "Could not start payment");
      setClientSecret(data.clientSecret);
      setPaymentStep("payment");
    } catch (e: any) {
      setPaymentError(e?.message ?? "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  }

  async function onPaymentSuccess(paymentIntentId: string) {
    setPaymentStep("processing");
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          event_id: event.id,
          user_id: user!.id,
          attendee_name: form.name,
          attendee_email: form.email,
          attendee_phone: form.phone,
          ticket_count: tickets,
          total_price: total,
          platform_fee: fee,
          organiser_payout: subtotal,
          waiver_accepted: true,
          status: "confirmed",
          stripe_payment_intent_id: paymentIntentId,
        })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message || "Could not create booking");

      await supabase.from("notifications").insert({
        user_id: user!.id,
        type: "booking_confirmed",
        message: `Your booking for ${event.title} is confirmed.`,
      });
      if (event.organiser_id) {
        await supabase.from("notifications").insert({
          user_id: event.organiser_id,
          type: "organiser_new_booking",
          message: `New booking for ${event.title} by ${form.name}.`,
        });
      }

      navigate({ to: "/booking/$bookingId", params: { bookingId: data.id } });
    } catch (e: any) {
      setPaymentError(e?.message ?? "Could not create booking");
      setPaymentStep("payment");
    }
  }

  if (paymentStep === "processing") {
    return (
      <main className="container-app py-20 flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="animate-spin" size={28} />
        <p>Confirming your booking…</p>
      </main>
    );
  }

  if (paymentStep === "payment" && clientSecret && stripePromise) {
    return (
      <main className="pb-32">
        <header className="container-app py-5">
          <button
            onClick={() => { setPaymentStep("details"); setPaymentError(null); }}
            className="inline-flex items-center gap-2 text-muted-foreground mb-4"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="text-[22px] font-semibold">Payment</h1>
        </header>
        <section className="container-app space-y-5">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
            <p className="font-medium">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}{tickets} ticket{tickets > 1 ? "s" : ""}
            </p>
            <p className="text-sm font-semibold mt-2">Total: €{total.toFixed(2)}</p>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "#E74C3C",
                  colorBackground: "#3A3A3A",
                  colorText: "#F5F5F5",
                  colorTextPlaceholder: "#6B6B6B",
                  borderRadius: "12px",
                },
              },
            }}
          >
            <PaymentForm
              total={total}
              onError={setPaymentError}
              onSuccess={onPaymentSuccess}
            />
          </Elements>

          {paymentError && (
            <div
              className="rounded-2xl p-4 flex items-start gap-3 text-sm"
              style={{
                backgroundColor: "color-mix(in oklab, var(--accent) 12%, transparent)",
                borderColor: "var(--accent)",
                borderWidth: 1,
                color: "var(--accent)",
              }}
              role="alert"
            >
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{paymentError}</span>
            </div>
          )}
        </section>
      </main>
    );
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

        {paymentError && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3 text-sm"
            style={{
              backgroundColor: "color-mix(in oklab, var(--accent) 12%, transparent)",
              borderColor: "var(--accent)",
              borderWidth: 1,
              color: "var(--accent)",
            }}
            role="alert"
          >
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{paymentError}</span>
          </div>
        )}
      </section>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        <div className="container-app py-3">
          <button onClick={continueToPayment} disabled={submitting} className="cta-button">
            {submitting ? "Loading…" : "Continue to Payment →"}
          </button>
        </div>
      </div>
    </main>
  );
}

function PaymentForm({
  total,
  onError,
  onSuccess,
}: {
  total: number;
  onError: (msg: string | null) => void;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    onError(null);
    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        onError(error.message ?? "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        onError("Payment did not complete");
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <PaymentElement />
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        <div className="container-app py-3">
          <button onClick={handlePay} disabled={!stripe || paying} className="cta-button">
            {paying ? "Processing…" : `Pay €${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </>
  );
}
