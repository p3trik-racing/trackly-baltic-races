import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useLang } from "@/i18n";
import { accessToken } from "@/lib/access-token";
import { createConnectAccountLink, createConnectDashboardLink, refreshConnectStatus } from "@/lib/payments.functions";

type Status = { connected: boolean; charges: boolean; payouts: boolean; details: boolean };

/** Stripe Connect status for organisers / track owners. Refreshes on mount (also covers ?stripe=return). */
export function useConnectStatus() {
  const [st, setSt] = useState<Status | null>(null);
  useEffect(() => {
    accessToken().then(async (token) => {
      if (!token) return;
      const r = await refreshConnectStatus({ data: { accessToken: token } });
      if (r.ok) setSt(r.data); else setSt({ connected: false, charges: false, payouts: false, details: false });
    });
  }, []);
  return st;
}

export function PayoutsCard({ status }: { status: Status | null }) {
  const { t } = useLang();
  const [country, setCountry] = useState<"LV" | "EE" | "LT">("LV");
  const [busy, setBusy] = useState(false);
  const ready = !!status?.payouts && !!status?.details;

  async function go(fn: "setup" | "dash") {
    setBusy(true);
    const token = await accessToken();
    if (!token) { setBusy(false); return; }
    const r = fn === "setup"
      ? await createConnectAccountLink({ data: { accessToken: token, country } })
      : await createConnectDashboardLink({ data: { accessToken: token } });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    if (fn === "setup") window.location.href = r.data; else window.open(r.data, "_blank", "noopener");
  }

  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("payouts.title")}</h2>
        {status === null && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>
      {status && ready && (
        <>
          <p className="text-sm inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" />{t("payouts.active")}</p>
          <button disabled={busy} onClick={() => go("dash")} className="w-full h-10 rounded-xl border border-border text-sm">{t("payouts.openDashboard")}</button>
        </>
      )}
      {status && !ready && (
        <>
          <p className="text-xs text-muted-foreground">{status.connected ? t("payouts.incompleteHint") : t("payouts.hint")}</p>
          {!status.connected && (
            <div className="flex gap-2">
              {(["LV", "EE", "LT"] as const).map((c) => (
                <button key={c} onClick={() => setCountry(c)} className="h-8 px-3 rounded-full border text-xs"
                  style={country === c ? { borderColor: "var(--accent)", color: "var(--accent)" } : { borderColor: "var(--border)" }}>{t(`payouts.country.${c}` as any)}</button>
              ))}
            </div>
          )}
          <button disabled={busy} onClick={() => go("setup")} className="w-full h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
            {busy && <Loader2 size={14} className="animate-spin" />}{status.connected ? t("payouts.finish") : t("payouts.setup")}
          </button>
        </>
      )}
    </section>
  );
}
