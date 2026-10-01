import { useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { useLang } from "@/i18n";

export const OAUTH_REDIRECT_KEY = "majorka-oauth-redirect";

/** Google (managed) + Apple (behind VITE_APPLE_SIGNIN=1). Returns to the public /login page, which forwards once the session exists. */
export function SocialAuthButtons({ redirect }: { redirect?: string }) {
  const { t } = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const appleOn = import.meta.env["VITE_APPLE_SIGNIN"] === "1";

  async function go(provider: "google" | "apple") {
    setBusy(provider);
    try { sessionStorage.setItem(OAUTH_REDIRECT_KEY, redirect ?? "/home"); } catch {}
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/login` });
    if (res.error) { setBusy(null); toast.error(res.error.message || t("auth.oauthFailed")); return; }
    if ((res as any).redirected) return;
    window.location.assign(redirect ?? "/home");
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => go("google")} disabled={!!busy}
        className="w-full h-12 rounded-xl border border-border bg-card text-sm font-medium flex items-center justify-center gap-2">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        {t("auth.continueGoogle")}
      </button>
      {appleOn && (
        <button type="button" onClick={() => go("apple")} disabled={!!busy}
          className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2">
          <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
            <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-164-40c-77 0-104 41-167 41s-107-58-157-129C43 788 0 670 0 557c0-181 118-277 233-277 62 0 113 40 152 40 37 0 95-43 165-43 27 0 123 3 187 64zM554 156c29-35 50-83 50-131 0-7-1-13-2-19-47 2-103 32-137 71-27 30-52 78-52 127 0 8 1 15 2 17 3 1 8 1 13 1 42 0 95-28 126-66z"/>
          </svg>
          {t("auth.continueApple")}
        </button>
      )}
      <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />{t("auth.or")}<span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
