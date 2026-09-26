import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { LogoFull } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Majorka Racing — Motorsport events in the Baltics" },
    { name: "description", content: "Track days, car meets and motorsport events in Riga and the Baltics — book your spot with Majorka Racing." },
    { property: "og:title", content: "Majorka Racing — Motorsport events in the Baltics" },
    { property: "og:description", content: "Track days and motorsport events in the Baltics" },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://majorkaracing.com" },
    { property: "og:image", content: "https://majorkaracing.com/og.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "Majorka Racing" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: "https://majorkaracing.com/og.png" },
  ] }),
  component: Splash,
});

function Splash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();

  useEffect(() => {
    if (loading) return;
    if (user) navigate({ to: "/home" });
  }, [user, loading, navigate]);

  if (loading || user) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center container-app text-center">
        <LogoFull className="w-[220px] h-auto mx-auto mb-8 text-foreground" />
        <p className="mt-3 text-muted-foreground text-base max-w-xs">
          {t("splash.tagline")}
        </p>
      </div>
      <div className="container-app pb-10 space-y-3">
        <Link to="/signup" className="cta-button">{t("common.signUp")}</Link>
        <Link
          to="/login"
          className="cta-button"
          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          {t("common.logIn")}
        </Link>
        <Link
          to="/home"
          className="block text-center text-sm text-muted-foreground py-3"
        >
          {t("splash.browse")}
        </Link>
        <LangSwitcher />
        <p className="text-center text-xs text-muted-foreground">
          <a href="https://majorkariga.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">{t("splash.majorkaRiga")}</a>
          {" · "}
          <a href="https://majorkashop.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">{t("splash.shop")}</a>
        </p>
        <p className="text-center text-muted-foreground pt-2" style={{ fontSize: "11px" }}>
          {t("splash.agreePrefix")}{" "}
          <Link to="/terms" style={{ color: "var(--accent)" }}>{t("splash.terms")}</Link>
          {" "}{t("splash.and")}{" "}
          <Link to="/privacy-policy" style={{ color: "var(--accent)" }}>{t("splash.privacy")}</Link>
        </p>
      </div>
    </main>
  );
}
