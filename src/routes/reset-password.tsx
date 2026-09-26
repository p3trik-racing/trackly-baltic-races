import { createFileRoute } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [done, setDone] = useState(false);
  const { t } = useLang();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
            <input id="reset-password" className="input-field" type="password" placeholder={t("auth.reset.newPassword")}
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="cta-button">{t("auth.reset.submit")}</button>
        </form>
      )}
    </main>
  );
}
