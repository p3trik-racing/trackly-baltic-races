import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDate } from "@/lib/format";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Minus, Plus, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { emailBookingCreated } from "@/lib/app-email.functions";
import { fireAndForget } from "@/lib/access-token";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

export const Route = createFileRoute("/_app/book/$eventId")({
  head: () => ({ meta: [
    { title: "Book an event — Majorka Racing" },
    { name: "description", content: "Book your spot at a track day or drift event with Majorka Racing." },
    { property: "og:title", content: "Book an event — Majorka Racing" },
    { property: "og:description", content: "Book your spot at a track day or drift event with Majorka Racing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
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
  const { t, lang } = useLang();
  const [event, setEvent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState(1);
  const [waiver, setWaiver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("details");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [existingBooking, setExistingBooking] = useState<any>(null);
  const [bookedCount, setBookedCount] = useState(0);

  useEffect(() => {
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => setEvent(data));
    supabase
      .from("bookings")
      .select("ticket_count,status")
      .eq("event_id", eventId)
      .then(({ data }) => {
        const total = (data ?? [])
          .filter((b: any) => b.status !== "cancelled")
          .reduce((sum: number, b: any) => sum + (b.ticket_count ?? 1), 0);
        setBookedCount(total);
      });
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
    supabase
      .from("bookings")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setExistingBooking(data ?? null));
  }, [user, eventId]);

  if (!event) return <div className="container-app py-10 text-muted-foreground">{t("common.loading")}</div>;

  const isFree = Number(event.price) === 0;
  const hasDeposit = Number(event.deposit) > 0 && Number(event.deposit) < Number(event.price);
  const onlinePrice = hasDeposit ? Number(event.deposit) : Number(event.price);
  const unlimited = !event.capacity || event.capacity === 0;
  const remaining = unlimited ? Infinity : Math.max(0, event.capacity - bookedCount);
  const soldOut = !unlimited && remaining === 0;
  const subtotal = onlinePrice * tickets;
  const fee = isFree ? 0 : +(subtotal * 0.05).toFixed(2);
  const total = isFree ? 0 : +(subtotal + fee).toFixed(2);

  async function confirmFreeBooking() {
    if (!user) return;
    if (!form.name || !form.email) return toast.error(t("book.fillDetails"));
    if (!waiver) return toast.error(t("book.acceptWaiver"));
    setPaymentError(null);
    setSubmitting(true);
    setPaymentStep("processing");
    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          event_id: event.id,
          attendee_name: form.name,
          attendee_email: form.email,
          attendee_phone: form.phone,
          ticket_count: tickets,
          amount_paid: 0,
          waiver_accepted: true,
        },
      });
      if (error || data?.error || !data?.id) {
        throw new Error(data?.error || error?.message || t("book.createFailed"));
      }
      fireAndForget((accessToken) => emailBookingCreated({ data: { accessToken, bookingId: data.id } }));

      navigate({ to: "/booking/$bookingId", params: { bookingId: data.id } });
    } catch (e: any) {
      setPaymentError(e?.message ?? t("book.createFailed"));
      setPaymentStep("details");
    } finally {
      setSubmitting(false);
    }
  }


  async function continueToPayment() {
    if (!user) return;
    if (!form.name || !form.email) return toast.error(t("book.fillDetails"));
    if (!waiver) return toast.error(t("book.acceptWaiver"));
    setPaymentError(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          event_id: event.id,
          ticket_count: tickets,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.clientSecret) throw new Error(data?.error || t("book.startPaymentFailed"));
      setClientSecret(data.clientSecret);
      setPaymentStep("payment");
    } catch (e: any) {
      setPaymentError(e?.message ?? t("book.startPaymentFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onPaymentSuccess(paymentIntentId: string) {
    setPaymentStep("processing");
    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          event_id: event.id,
          attendee_name: form.name,
          attendee_email: form.email,
          attendee_phone: form.phone,
          ticket_count: tickets,
          amount_paid: total,
          waiver_accepted: true,
          stripe_payment_intent_id: paymentIntentId,
        },
      });
      if (error || data?.error || !data?.id) {
        throw new Error(data?.error || error?.message || t("book.createFailed"));
      }
      fireAndForget((accessToken) => emailBookingCreated({ data: { accessToken, bookingId: data.id } }));

      navigate({ to: "/booking/$bookingId", params: { bookingId: data.id } });
    } catch (e: any) {
      setPaymentError(e?.message ?? t("book.createFailed"));
      setPaymentStep("payment");
    }
  }


  if (paymentStep === "processing") {
    return (
      <main className="container-app py-20 flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="animate-spin" size={28} />
        <p>{t("book.confirming")}</p>
      </main>
    );
  }

  if (paymentStep === "payment" && clientSecret && stripePromise) {
    const palette = getComputedStyle(document.documentElement);
    return (
      <main className="pb-32">
        <header className="container-app py-5">
          <button
            onClick={() => { setPaymentStep("details"); setPaymentError(null); }}
            className="inline-flex items-center gap-2 text-muted-foreground mb-4"
          >
            <ArrowLeft size={18} /> {t("common.back")}
          </button>
          <h1 className="text-[22px] font-semibold">{t("book.payment")}</h1>
        </header>
        <section className="container-app space-y-5">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
            <p className="font-medium">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(event.date, lang, "medium")}
              {" · "}{t(tickets > 1 ? "book.spotsCountPlural" : "book.spotsCount", { count: tickets })}
            </p>
            <p className="text-sm font-semibold mt-2">{t("book.totalValue", { total: total.toFixed(2) })}</p>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: palette.getPropertyValue("--accent").trim(),
                  colorBackground: palette.getPropertyValue("--input").trim(),
                  colorText: palette.getPropertyValue("--foreground").trim(),
                  colorTextPlaceholder: palette.getPropertyValue("--muted-foreground").trim(),
                  borderRadius: "12px",
                },
              },
            }}
          >
            <PaymentForm
              total={total}
              hasDeposit={hasDeposit}
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

  if (existingBooking) {
    return (
      <main className="pb-32">
        <header className="container-app py-5">
          <button onClick={() => navigate({ to: "/event/$eventId", params: { eventId } })}
            className="inline-flex items-center gap-2 text-muted-foreground mb-4">
            <ArrowLeft size={18} /> {t("common.back")}
          </button>
          <h1 className="text-[22px] font-semibold">{t("book.checkout")}</h1>
        </header>
        <section className="container-app space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={48} className="text-green-500" />
            <p className="font-medium">{t("book.alreadyBooked")}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {existingBooking.id.slice(0, 8).toUpperCase()}
            </p>
            <button
              onClick={() => navigate({ to: "/booking/$bookingId", params: { bookingId: existingBooking.id } })}
              className="cta-button mt-2"
            >
              {t("book.viewBooking")}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-32">
      <header className="container-app py-5">
        <button onClick={() => navigate({ to: "/event/$eventId", params: { eventId } })}
          className="inline-flex items-center gap-2 text-muted-foreground mb-4">
          <ArrowLeft size={18} /> {t("common.back")}
        </button>
        <h1 className="text-[22px] font-semibold">{t("book.checkout")}</h1>
      </header>

      <section className="container-app space-y-5">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">{t("book.event")}</p>
          <p className="font-medium">{event.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(event.date, lang, "medium")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">{t("book.attendee")}</label>
          <input className="input-field" placeholder={t("book.fullName")} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-field" placeholder={t("book.email")} type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input-field" placeholder={t("book.phone")} type="tel" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("book.spots")}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setTickets((t) => Math.max(1, t - 1))}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center">
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-semibold">{tickets}</span>
              <button
                onClick={() => setTickets((t) => Math.min(remaining, t + 1))}
                disabled={tickets >= remaining}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40">
                <Plus size={14} />
              </button>
            </div>
          </div>
          {!unlimited && (
            <p className="text-xs text-muted-foreground">
              {soldOut ? t("common.soldOut") : t("book.spotsRemaining", { count: remaining })}
            </p>
          )}
        </div>

        {!isFree && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t(hasDeposit ? "book.depositNow" : "book.spotsLine", { count: tickets, price: onlinePrice.toFixed(2) })}</span><span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t("book.platformFee")}</span><span>€{fee.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span>{t("book.total")}</span><span>€{total.toFixed(2)}</span>
            </div>
            {hasDeposit && <p className="text-xs text-muted-foreground">{t("book.balanceAtTrack", { amount: ((Number(event.price) - Number(event.deposit)) * tickets).toFixed(2) })}</p>}
          </div>
        )}
        {isFree && (
          <div className="bg-card border border-border rounded-2xl p-4 flex justify-between font-semibold text-sm">
            <span>{t("book.total")}</span><span>{t("common.free")}</span>
          </div>
        )}

        <label className="flex items-start gap-2 text-xs text-muted-foreground bg-card border border-border rounded-2xl p-4">
          <input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)}
            className="mt-1 accent-[var(--accent)] flex-shrink-0" />
          <span>
            {t("book.waiverPrefix")} {" "}
            <Link to="/event-terms" target="_blank" className="text-accent underline">
              {t("book.waiverLink")}
            </Link>
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
        style={{ paddingBottom: "calc(90px + env(safe-area-inset-bottom))" }}
      >
        <div className="container-app py-3">
          <button
            onClick={isFree ? confirmFreeBooking : continueToPayment}
            disabled={submitting || soldOut}
            className="cta-button"
          >
            {soldOut
              ? t("common.soldOut")
              : submitting
                ? t("common.loading")
                : isFree
                  ? t("book.confirmFree")
                  : t("book.continueToPayment")}
          </button>
        </div>
      </div>
    </main>
  );
}

function PaymentForm({
  total,
  hasDeposit,
  onError,
  onSuccess,
}: {
  total: number;
  hasDeposit: boolean;
  onError: (msg: string | null) => void;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const { t } = useLang();

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
        onError(error.message ?? t("book.paymentFailed"));
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        onError(t("book.paymentIncomplete"));
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
        style={{ paddingBottom: "calc(90px + env(safe-area-inset-bottom))" }}
      >
        <div className="container-app py-3">
          <button onClick={handlePay} disabled={!stripe || paying} className="cta-button">
            {paying ? t("book.processing") : t(hasDeposit ? "book.payDeposit" : "book.pay", { total: total.toFixed(2) })}
          </button>
        </div>
      </div>
    </>
  );
}
