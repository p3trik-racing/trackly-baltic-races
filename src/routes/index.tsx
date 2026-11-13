import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { LogoFull } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Trackly Racing | Book the track. Split the bill." },
    { name: "description", content: "Trackly Racing: book track days, drift days and ice driving in Latvia, Lithuania and Estonia. Book the whole track or a single slot and split the cost with friends." },
    { property: "og:title", content: "Trackly Racing | Book the track. Split the bill." },
    { property: "og:description", content: "Trackly Racing: book track days, drift days and ice driving in Latvia, Lithuania and Estonia. Book the whole track or a single slot and split the cost with friends." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://trackly.racing" },
    { property: "og:image", content: "https://trackly.racing/og.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "Trackly" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: "https://trackly.racing/og.png" },
  ], links: [{ rel: "canonical", href: "https://trackly.racing" }] }),
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
        <LogoFull className="w-[150px] h-auto mx-auto mb-8 text-foreground" />
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
        <section className="text-center text-muted-foreground pt-4 max-w-sm mx-auto" style={{ fontSize: "12px" }}>
          <h2 className="font-medium mb-1" style={{ fontSize: "13px" }}>{t("splash.seoTitle")}</h2>
          <p>{t("splash.seoBody")}</p>
        </section>
        <p className="text-center text-muted-foreground pt-2" style={{ fontSize: "11px" }}>
          {t("splash.agreePrefix")}{" "}
          <Link to="/terms" style={{ color: "var(--accent)" }}>{t("splash.terms")}</Link>
          {" "}{t("splash.and")}{" "}
          <Link to="/event-terms" style={{ color: "var(--accent)" }}>{t("eventTerms.title")}</Link>
          {", "}
          <Link to="/privacy-policy" style={{ color: "var(--accent)" }}>{t("splash.privacy")}</Link>
        </p>
      </div>
    </main>
  );
}
