import { Link } from "@tanstack/react-router";
import { useLang } from "@/i18n";

export function CompeteBanner() {
  const { t } = useLang();
  return (
    <Link to="/competitions"
      className="block text-sm font-medium rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--accent)", color: "var(--accent)", backgroundColor: "color-mix(in oklab, var(--accent) 10%, var(--card))" }}>
      {t("compete.banner")}
    </Link>
  );
}
