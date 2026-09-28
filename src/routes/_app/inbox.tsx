import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({ meta: [
    { title: "Inbox — Majorka Racing" },
    { name: "description", content: "View your booking and event notifications." },
    { property: "og:title", content: "Inbox — Majorka Racing" },
    { property: "og:description", content: "View your booking and event notifications." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: InboxPage,
});

interface Notif {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  title?: string | null;
  link?: string | null;
}

function InboxPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any) ?? []));
  }, [user]);

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
  }

  return (
    <main className="container-app py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold">{t("inbox.title")}</h1>
        {items.some((i) => !i.read) && (
          <button onClick={markAllRead} className="text-sm" style={{ color: "var(--accent)" }}>
            {t("inbox.markAllRead")}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell size={32} className="mx-auto mb-3 opacity-60" />
          <p className="text-sm">{t("inbox.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="bg-card border border-border rounded-2xl p-4 flex gap-3">
              {!n.read && <span className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: "var(--accent)" }} />}
              <div className="flex-1">
                {n.type === "organiser_message" && (
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{t("inbox.fromOrganiser")}</p>
                )}
                {n.type === "new_event" && (
                  <p className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: "var(--accent)" }}>{t("inbox.newEvent")}</p>
                )}
                {n.title && <p className="text-sm font-semibold">{n.title}</p>}
                <p className="text-sm whitespace-pre-wrap">{n.message}</p>
                {n.link && (
                  <a href={n.link} className="text-xs inline-flex items-center gap-1 mt-1" style={{ color: "var(--accent)" }}
                    {...(/^https?:/.test(n.link) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {t("inbox.open")} <ExternalLink size={11} />
                  </a>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
