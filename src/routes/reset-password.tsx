import { createFileRoute } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password — Majorka Racing" },
    { name: "description", content: "Set a new password for your Majorka Racing account." },
    { property: "og:title", content: "Reset password — Majorka Racing" },
    { property: "og:description", content: "Set a new password for your Majorka Racing account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const { t } = useLang();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error(t("auth.passwordMismatch"));
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success(t("auth.reset.done"));
  }

  return (
    <main className="min-h-screen container-app py-10">
      <h1 className="text-2xl font-semibold mb-6">{t("auth.reset.title")}</h1>
      {done ? (
        <a href="/login" className="cta-button">{t("auth.reset.backToLogin")}</a>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="reset-password" className="block text-xs text-muted-foreground">{t("auth.reset.newPassword")}</label>
            <div className="relative">
              <input id="reset-password" className="input-field pr-12" type={showPw ? "text" : "password"} placeholder={t("auth.reset.newPassword")}
                value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-2">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="reset-confirm-password" className="block text-xs text-muted-foreground">{t("auth.reset.confirmNewPassword")}</label>
            <input id="reset-confirm-password" className="input-field" type={showPw ? "text" : "password"} placeholder={t("auth.reset.confirmNewPassword")}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password"
              aria-describedby={password && confirmPassword ? "reset-password-match" : undefined} />
            {password && confirmPassword && (
              <p id="reset-password-match" role="status" className={`flex items-center gap-1 text-xs ${password === confirmPassword ? "text-success" : "text-accent"}`}>
                {password === confirmPassword && <Check size={14} aria-hidden="true" />}
                {t(password === confirmPassword ? "auth.passwordsMatch" : "auth.passwordMismatch")}
              </p>
            )}
          </div>
          <button className="cta-button">{t("auth.reset.submit")}</button>
        </form>
      )}
    </main>
  );
}
