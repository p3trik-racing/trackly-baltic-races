import { Link, useLocation } from "@tanstack/react-router";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { Home, Compass, Ticket, Bell, User, CalendarPlus } from "lucide-react";

const baseTabs = [
  { to: "/home", label: "nav.home", icon: Home },
  { to: "/explore", label: "nav.explore", icon: Compass },
  { to: "/bookings", label: "nav.bookings", icon: Ticket },
  { to: "/inbox", label: "nav.inbox", icon: Bell },
  { to: "/profile", label: "nav.profile", icon: User },
] as const;

export function BottomNav({ isOrganiser = false }: { isOrganiser?: boolean }) {
  const { pathname } = useLocation();
  const { t } = useLang();
  const tabs = isOrganiser
    ? [...baseTabs.slice(0, 4), { to: "/organiser", label: "nav.organiser", icon: CalendarPlus } as const, baseTabs[4]]
    : baseTabs;
  const iconSize = tabs.length === 6 ? 20 : 22;
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-nav border-t-[1px]"
      style={{ borderTopColor: "var(--primary)" }}
    >
      <div className="container-app flex justify-between py-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-1.5 flex-1 min-w-0"
              style={{ color: active ? "var(--accent)" : "var(--nav-inactive)" }}
            >
              <Icon size={iconSize} />
              <span className="text-[10px] font-medium truncate">{t(label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
