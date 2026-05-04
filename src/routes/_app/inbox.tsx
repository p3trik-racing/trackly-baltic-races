import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_app/inbox")({
  component: InboxPage,
});

interface Notif {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

function InboxPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
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
        <h1 className="text-[22px] font-semibold">Inbox</h1>
        {items.some((i) => !i.read) && (
          <button onClick={markAllRead} className="text-sm" style={{ color: "var(--accent)" }}>
            Mark all read
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell size={32} className="mx-auto mb-3 opacity-60" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="bg-card border border-border rounded-2xl p-4 flex gap-3">
              {!n.read && <span className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: "var(--accent)" }} />}
              <div className="flex-1">
                <p className="text-sm">{n.message}</p>
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
