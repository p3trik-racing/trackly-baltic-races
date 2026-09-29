import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/i18n";

export interface MiniProfile { user_id?: string; id?: string; username: string | null; full_name: string | null; avatar_url: string | null }

export const displayName = (p: MiniProfile) => p.full_name || (p.username ? `@${p.username}` : "—");

export function Avatar({ p, size = 40 }: { p: MiniProfile; size?: number }) {
  const initial = (p.full_name || p.username || "?").trim().charAt(0).toUpperCase();
  return p.avatar_url ? (
    <img src={p.avatar_url} alt="" className="rounded-full object-cover border-2 border-background shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full bg-input border-2 border-background inline-flex items-center justify-center font-medium shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>{initial}</span>
  );
}

export function FriendsGoing({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const { t } = useLang();
  const [list, setList] = useState<MiniProfile[]>([]);
  useEffect(() => {
    if (!user) { setList([]); return; }
    supabase.rpc("friends_going", { _event_id: eventId }).then(({ data }) => setList((data as MiniProfile[]) ?? []));
  }, [user, eventId]);
  if (!user || list.length === 0) return null;
  const first = displayName(list[0]);
  const text = list.length === 1 ? t("friends.goingOne", { name: first }) : t("friends.goingMany", { name: first, n: list.length - 1 });
  return (
    <div className="container-app pb-4">
      <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
        <div className="flex -space-x-2">{list.slice(0, 4).map((p) => <Avatar key={p.user_id} p={p} size={28} />)}</div>
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}
