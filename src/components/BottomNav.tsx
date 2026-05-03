import { Link, useLocation } from "@tanstack/react-router";
import { Home, Compass, Ticket, Bell, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/bookings", label: "Bookings", icon: Ticket },
  { to: "/inbox", label: "Inbox", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
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
              className="flex flex-col items-center gap-1 py-1.5 flex-1"
              style={{ color: active ? "var(--accent)" : "var(--nav-inactive)" }}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
