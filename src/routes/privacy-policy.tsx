import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Majorka Racing" },
      { name: "description", content: "How Majorka Racing collects, uses, and protects your personal data." },
      { property: "og:title", content: "Privacy Policy — Majorka Racing" },
      { property: "og:description", content: "How Majorka Racing collects, uses, and protects your personal data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const { t } = useLang();
  return (
    <main className="container-app py-6 pb-20 max-w-2xl">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft size={20} /> {t("common.back")}
      </Link>
      <h1 className="text-2xl font-semibold">{t("privacy.title")}</h1>
      <p className="text-xs text-muted-foreground mt-1 mb-6">{t("privacy.updated")}</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <Section title={t("privacy.s1.title")}>{t("privacy.s1.body")}</Section>
        <Section title={t("privacy.s2.title")}>{t("privacy.s2.body")}</Section>
        <Section title={t("privacy.s3.title")}>{t("privacy.s3.body")}</Section>
        <Section title={t("privacy.s4.title")}>{t("privacy.s4.body")}</Section>
        <Section title={t("privacy.s5.title")}>{t("privacy.s5.body")}</Section>
        <Section title={t("privacy.s6.title")}>{t("privacy.s6.body")}</Section>
        <Section title={t("privacy.s7.title")}>{t("privacy.s7.body")}</Section>
        <Section title={t("privacy.s8.title")}>{t("privacy.s8.body")}</Section>
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
