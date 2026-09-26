import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Majorka Racing" },
      { name: "description", content: "Terms governing the use of the Majorka Racing motorsport booking platform." },
      { property: "og:title", content: "Terms of Service — Majorka Racing" },
      { property: "og:description", content: "Terms governing the use of the Majorka Racing motorsport booking platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useLang();
  return (
    <main className="container-app py-6 pb-20 max-w-2xl">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft size={20} /> {t("common.back")}
      </Link>
      <h1 className="text-2xl font-semibold">{t("terms.title")}</h1>
      <p className="text-xs text-muted-foreground mt-1 mb-6">{t("terms.updated")}</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <Section title={t("terms.s1.title")}>{t("terms.s1.body")}</Section>
        <Section title={t("terms.s2.title")}>{t("terms.s2.body")}</Section>
        <Section title={t("terms.s3.title")}>{t("terms.s3.body")}</Section>
        <Section title={t("terms.s4.title")}>{t("terms.s4.body")}</Section>
        <Section title={t("terms.s5.title")}>{t("terms.s5.body")}</Section>
        <Section title={t("terms.s6.title")}>{t("terms.s6.body")}</Section>
        <Section title={t("terms.s7.title")}>{t("terms.s7.body")}</Section>
        <Section title={t("terms.s8.title")}>{t("terms.s8.body")}</Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}
