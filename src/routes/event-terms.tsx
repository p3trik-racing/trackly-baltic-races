import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/i18n";

export const Route = createFileRoute("/event-terms")({
  head: () => ({ meta: [
    { title: "Event Participation Terms — Majorka Racing" },
    { name: "description", content: "Safety, participation and liability terms for events booked through Majorka Racing." },
    { property: "og:title", content: "Event Participation Terms — Majorka Racing" },
    { property: "og:description", content: "Safety, participation and liability terms for events booked through Majorka Racing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EventTermsPage,
});

function EventTermsPage() {
  const { t } = useLang();
  return (
    <main className="container-app max-w-2xl py-6 pb-20">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-muted-foreground">
        <ArrowLeft size={20} /> {t("common.back")}
      </Link>
      <h1 className="text-2xl font-semibold">{t("eventTerms.title")}</h1>
      <p className="mb-6 mt-1 text-xs text-muted-foreground">{t("eventTerms.updated")}</p>
      <div className="space-y-6 text-sm leading-relaxed">
        {Array.from({ length: 12 }, (_, index) => index + 1).map((number) => (
          <section key={number}>
            <h2 className="mb-2 font-semibold">{t(`eventTerms.s${number}.title` as import("@/i18n/en").TranslationKey)}</h2>
            <p className="text-muted-foreground">{t(`eventTerms.s${number}.body` as import("@/i18n/en").TranslationKey)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}