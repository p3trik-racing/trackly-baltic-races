import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { LogoFull } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Log in — Majorka Racing" },
    { name: "description", content: "Log in to Majorka Racing to manage your motorsport bookings." },
    { property: "og:title", content: "Log in — Majorka Racing" },
    { property: "og:description", content: "Log in to Majorka Racing to manage your motorsport bookings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/home" });
  }

  async function onReset() {
    if (!email) return toast.error(t("auth.login.enterEmailFirst"));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(t("auth.login.resetSent"));
  }

  return (
    <main className="min-h-screen container-app py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft size={20} /> {t("common.back")}
      </Link>

      <LogoFull className="w-[180px] h-auto mx-auto mb-6 text-foreground" />

      <h1 className="text-2xl font-semibold mb-1">{t("auth.login.title")}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t("auth.login.subtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="login-email" className="block text-xs text-muted-foreground">{t("auth.email")}</label>
          <input id="login-email" className="input-field" type="email" placeholder={t("auth.email")} value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="space-y-1">
          <label htmlFor="login-password" className="block text-xs text-muted-foreground">{t("auth.password")}</label>
          <div className="relative">
            <input id="login-password" className="input-field pr-12" type={showPw ? "text" : "password"} placeholder={t("auth.password")} value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <button type="button" onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-2">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button className="cta-button" disabled={loading}>{loading ? t("auth.login.submitting") : t("auth.login.submit")}</button>
      </form>
      <button onClick={onReset} className="block mx-auto mt-4 text-sm" style={{ color: "var(--accent)" }}>
        {t("auth.login.forgot")}
      </button>
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("auth.login.newHere")} <Link to="/signup" style={{ color: "var(--accent)" }}>{t("auth.login.createAccount")}</Link>
      </p>
      <LangSwitcher className="mt-8" />
    </main>
  );
}
