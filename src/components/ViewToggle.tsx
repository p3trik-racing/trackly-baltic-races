import { Link, useLocation } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { List, Map, CalendarDays } from "lucide-react";

const items = [
  { to: "/home", label: "viewToggle.list", icon: List },
  { to: "/map", label: "viewToggle.map", icon: Map },
  { to: "/calendar", label: "viewToggle.calendar", icon: CalendarDays },
] as const;

export function ViewToggle({ className = "" }: { className?: string }) {
  const { pathname } = useLocation();
  const { t } = useLang();
  return (
    <div className={`flex gap-1.5 ${className}`} role="tablist" aria-label={t("viewToggle.label")}>
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || (to === "/home" && pathname === "/explore");
        return (
          <Link
            key={to}
            to={to}
            role="tab"
            aria-selected={active}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: active ? "var(--accent)" : "var(--card)",
              color: active ? "var(--accent-foreground)" : "var(--foreground)",
              borderColor: active ? "var(--accent)" : "var(--border)",
            }}
          >
            <Icon size={14} /> {t(label)}
          </Link>
        );
      })}
    </div>
  );
}
