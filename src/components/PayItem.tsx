import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useLang } from "@/i18n";
import { accessToken } from "@/lib/access-token";
import { createItemPayment, confirmItemPayment } from "@/lib/payments.functions";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { eur } from "@/lib/tracks";

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
let stripePromise: ReturnType<typeof loadStripe> | null = null;
export const getStripe = () => (PK ? (stripePromise ??= loadStripe(PK)) : null);
export const isTestMode = () => !!PK && PK.startsWith("pk_test_");

export function TestModeNote() {
  const { t } = useLang();
  if (!isTestMode()) return null;
  return <p className="text-[11px] text-muted-foreground border border-dashed border-border rounded-lg px-3 py-2">{t("pay.testMode")}</p>;
}

export function stripeAppearance() {
  const p = getComputedStyle(document.documentElement);
  return {
    theme: "night" as const,
    variables: {
      colorPrimary: p.getPropertyValue("--accent").trim(),
      colorBackground: p.getPropertyValue("--input").trim(),
      colorText: p.getPropertyValue("--foreground").trim(),
      colorTextPlaceholder: p.getPropertyValue("--muted-foreground").trim(),
      borderRadius: "12px",
    },
  };
}

/** Countdown "mm:ss" until a deadline; null when no deadline. */
export function useCountdown(until?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!until) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [until]);
  if (!until) return null;
  const ms = Math.max(0, new Date(until).getTime() - now);
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return { expired: ms <= 0, label: `${m}:${String(s).padStart(2, "0")}` };
}

/** "Pay" button + sheet with Stripe Payment Element (cards, Apple Pay, Google Pay). */
export function PayItem({ kind, id, label, autoOpen, payBy, onPaid }: {
  kind: "slot" | "ticket"; id: string; label: string; autoOpen?: boolean; payBy?: string | null; onPaid: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const cd = useCountdown(payBy);

  async function start() {
    const stripe = getStripe();
    if (!stripe) return toast.error(t("pay.notConfigured"));
    setBusy(true);
    const token = await accessToken();
    if (!token) { setBusy(false); return toast.error(t("pay.signIn")); }
    const r = await createItemPayment({ data: { accessToken: token, kind, id } });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setSecret(r.data.clientSecret); setTotal(r.data.total); setOpen(true);
  }
  useEffect(() => { if (autoOpen) start(); }, [autoOpen]);

  return (
    <>
      {cd && !cd.expired && <p className="text-xs" style={{ color: "var(--accent)" }}>{t("pay.within30", { time: cd.label })}</p>}
      <button onClick={start} disabled={busy || cd?.expired} className="w-full h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
        {busy && <Loader2 size={14} className="animate-spin" />}{cd?.expired ? t("pay.expired") : label}
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left"><DrawerTitle>{t("pay.title", { total: eur(total) })}</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-8 space-y-3 max-h-[80vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground">{t("pay.feeIncluded")}</p>
            <TestModeNote />
            {secret && getStripe() && (
              <Elements stripe={getStripe()} options={{ clientSecret: secret, appearance: stripeAppearance() }}>
                <PayForm kind={kind} id={id} total={total} onPaid={() => { setOpen(false); onPaid(); }} />
              </Elements>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function PayForm({ kind, id, total, onPaid }: { kind: "slot" | "ticket"; id: string; total: number; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true); setErr(null);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
      if (error) return setErr(error.message ?? t("book.paymentFailed"));
      if (paymentIntent?.status !== "succeeded") return setErr(t("book.paymentIncomplete"));
      const token = await accessToken();
      const r = await confirmItemPayment({ data: { accessToken: token ?? "", kind, id, paymentIntentId: paymentIntent.id } });
      if (!r.ok) return setErr(r.error);
      toast.success(t("pay.done"));
      onPaid();
    } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <PaymentElement />
      {err && <p className="text-sm" role="alert" style={{ color: "var(--accent)" }}>{err}</p>}
      <button onClick={pay} disabled={!stripe || busy} className="w-full h-12 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
        {busy ? t("book.processing") : t("pay.payNow", { total: eur(total) })}
      </button>
    </div>
  );
}
