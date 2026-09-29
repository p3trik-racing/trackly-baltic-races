import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n";

const KEY = "majorka-inapp-dismissed";

export function InAppBrowserBanner() {
  const { t } = useLang();
  const [state, setState] = useState<{ show: boolean; android: boolean }>({ show: false, android: false });

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const inApp = /Telegram|Instagram|FBAN|FBAV|BytedanceWebview|musical_ly/i.test(ua) || !!(window as any).TelegramWebviewProxy;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(KEY) === "1"; } catch {}
    setState({ show: inApp && !dismissed, android: /android/i.test(ua) });
  }, []);

  if (!state.show) return null;
  const url = window.location.href;
  const intent = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;

  return (
    <div className="sticky top-0 z-50 bg-card border-b border-border px-3 py-2 flex items-center gap-2 text-xs">
      <p className="flex-1 min-w-0">{t("inapp.banner")}</p>
      <button type="button" className="px-2 h-8 rounded-lg border border-border shrink-0"
        onClick={() => navigator.clipboard?.writeText(url).then(() => toast.success(t("inapp.copied")), () => {})}>
        {t("inapp.copy")}
      </button>
      {state.android && (
        <a href={intent} className="px-2 h-8 inline-flex items-center rounded-lg shrink-0 font-medium"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>{t("inapp.chrome")}</a>
      )}
      <button type="button" aria-label={t("inapp.dismiss")} className="p-1 shrink-0"
        onClick={() => { try { sessionStorage.setItem(KEY, "1"); } catch {} setState((s) => ({ ...s, show: false })); }}>
        <X size={16} />
      </button>
    </div>
  );
}
