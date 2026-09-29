import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLang } from "@/i18n";
import { SITE_URL } from "@/lib/site";

export function QrPass({ bookingId, code, checkedInAt, url: customUrl }: { bookingId: string; code: string; checkedInAt?: string | null; url?: string }) {
  const { t } = useLang();
  const [src, setSrc] = useState<string | null>(null);
  const url = customUrl ?? `${SITE_URL}/checkin/${bookingId}?c=${code}`;

  useEffect(() => {
    QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 480, color: { dark: "#000000", light: "#FFFFFF" } })
      .then(setSrc).catch(() => setSrc(null));
  }, [url]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3 text-center">
      <p className="text-sm font-medium">{t("checkin.passTitle")}</p>
      {checkedInAt ? (
        <p className="text-lg font-semibold" style={{ color: "var(--success)" }}>
          {t("checkin.checkedInAt", { time: new Date(checkedInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) })}
        </p>
      ) : null}
      <div className="mx-auto rounded-xl p-2" style={{ background: "#FFFFFF", width: 264, height: 264 }}>
        {src && <img src={src} alt="QR" width={248} height={248} style={{ width: 248, height: 248, imageRendering: "pixelated" }} />}
      </div>
      <p className="font-mono text-2xl font-semibold tracking-widest">{t("checkin.code", { code: code.toUpperCase() })}</p>
      <p className="text-xs text-muted-foreground">{t("checkin.hint")}</p>
    </div>
  );
}
