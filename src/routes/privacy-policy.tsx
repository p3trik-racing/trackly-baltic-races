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
        <Section title={t("privacy.proc.title")}>{t("privacy.proc.body")}</Section>
        <Section title={t("privacy.rights.title")}>{t("privacy.rights.body")}</Section>
        <section>
          <h2 className="font-semibold mb-2">{t("privacy.ret.title")}</h2>
          <table className="w-full text-left text-muted-foreground border-collapse">
            <thead><tr className="border-b border-border"><th className="py-2 pr-3 font-medium text-foreground">{t("privacy.ret.colData")}</th><th className="py-2 font-medium text-foreground">{t("privacy.ret.colPeriod")}</th></tr></thead>
            <tbody>
              {(["account", "bookings", "emails"] as const).map((k) => (
                <tr key={k} className="border-b border-border align-top">
                  <td className="py-2 pr-3">{t(`privacy.ret.${k}` as any)}</td>
                  <td className="py-2">{t(`privacy.ret.${k}P` as any)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <Section title={t("privacy.cookies.title")}>{t("privacy.cookies.body")}</Section>
        <Section title={t("privacy.contact.title")}>{t("privacy.s8.body")}</Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground whitespace-pre-line">{children}</p>
    </section>
  );
}
