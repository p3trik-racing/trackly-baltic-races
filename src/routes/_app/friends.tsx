import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Share2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/i18n";
import { ucFirst } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { ShareSheet } from "@/components/ShareSheet";
import { Avatar, displayName, type MiniProfile } from "@/components/FriendsGoing";

export const Route = createFileRoute("/_app/friends")({
  head: () => ({ meta: [
    { title: "Friends — Majorka Racing" },
    { name: "description", content: "Add friends and see which track days and drift events they're going to." },
    { property: "og:title", content: "Friends — Majorka Racing" },
    { property: "og:description", content: "Add friends and see which track days and drift events they're going to." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: FriendsPage,
});

type Friend = MiniProfile & { friendship_id: string; user_id: string; status: string; incoming: boolean };
type Found = MiniProfile & { id: string; friendship: "friends" | "sent" | "received" | null };

function FriendsPage() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState<"friends" | "requests" | "find">("friends");
  const [rows, setRows] = useState<Friend[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data }, { data: p }] = await Promise.all([
      supabase.rpc("my_friends"),
      supabase.from("profiles").select("invite_code").eq("id", user.id).maybeSingle(),
    ]);
    setRows((data as Friend[]) ?? []);
    setCode(p?.invite_code ?? null);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const search = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setFound([]); return; }
    const { data } = await supabase.rpc("search_profiles", { _q: term.trim() });
    setFound((data as Found[]) ?? []);
  }, []);
  useEffect(() => { const h = setTimeout(() => search(q), 350); return () => clearTimeout(h); }, [q, search]);

  if (!loading && !user) return (
    <main className="container-app py-10 text-center space-y-3">
      <p className="text-sm text-muted-foreground">{t("friends.loginPrompt")}</p>
      <Link to="/login" search={{ redirect: "/friends" }} className="cta-button">{t("auth.login.submit")}</Link>
    </main>
  );

  const friends = rows.filter((r) => r.status === "accepted");
  const incoming = rows.filter((r) => r.status === "pending" && r.incoming);
  const outgoing = rows.filter((r) => r.status === "pending" && !r.incoming);
  const link = code ? `${SITE_URL}/invite/${code}` : "";

  async function respond(id: string, accept: boolean) {
    const { error } = await supabase.rpc("respond_friend_request", { _id: id, _accept: accept });
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(p: Friend) {
    if (!confirm(t("friends.removeConfirm", { name: displayName(p) }))) return;
    const { error } = await supabase.rpc("remove_friend", { _other: p.user_id });
    if (error) return toast.error(error.message);
    load();
  }
  async function add(id: string) {
    const { data, error } = await supabase.rpc("send_friend_request", { _target: id });
    if (error) return toast.error(error.message);
    toast.success(data === "accepted" ? t("friends.nowFriends") : data === "already_friends" ? t("friends.alreadyFriends") : t("friends.requestSent"));
    search(q); load();
  }

  const Row = ({ p, children }: { p: MiniProfile; children?: React.ReactNode }) => (
    <div className="flex items-center gap-3 py-2">
      <Avatar p={p} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{displayName(p)}</p>
        {p.username && <p className="text-xs text-muted-foreground truncate">@{p.username}</p>}
      </div>
      {children}
    </div>
  );
  const small = "h-8 px-3 rounded-lg text-xs font-medium";
  const accent = { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" };

  return (
    <main className="container-app py-6 space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft size={18} /> {t("common.back")}</Link>
      <h1 className="text-[22px] font-semibold">{t("friends.title")}</h1>

      <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <p className="font-medium text-sm">{t("friends.inviteTitle")}</p>
        <p className="text-xs text-muted-foreground break-all">{link || t("common.loading")}</p>
        <div className="flex gap-2">
          <button disabled={!link} className={`${small} border border-border inline-flex items-center gap-1`}
            onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); toast.success(t("share.copied")); }}>
            <Copy size={13} /> {t("share.copy")}
          </button>
          <button disabled={!link} className={`${small} inline-flex items-center gap-1`} style={accent} onClick={() => setShareOpen(true)}>
            <Share2 size={13} /> {t("share.title")}
          </button>
        </div>
      </section>
      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} title="Majorka Racing" url={link} text={t("friends.inviteText")} />

      <div className="flex gap-1 bg-card p-1 rounded-xl border border-border">
        {(["friends", "requests", "find"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className="flex-1 h-9 rounded-lg text-sm font-medium"
            style={tab === k ? accent : undefined}>
            {ucFirst(t(`friends.tab.${k}` as any))}{k === "requests" && incoming.length > 0 ? ` (${incoming.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "friends" && (friends.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t("friends.none")}</p> : (
        <div className="divide-y divide-border">
          {friends.map((p) => (
            <Row key={p.friendship_id} p={p}>
              <button aria-label={t("friends.remove")} onClick={() => remove(p)} className="w-8 h-8 rounded-full border border-border inline-flex items-center justify-center"><X size={14} /></button>
            </Row>
          ))}
        </div>
      ))}

      {tab === "requests" && (
        <div className="space-y-4">
          {incoming.length === 0 && outgoing.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t("friends.noRequests")}</p>}
          {incoming.map((p) => (
            <Row key={p.friendship_id} p={p}>
              <button className={small} style={accent} onClick={() => respond(p.friendship_id, true)}>{t("friends.accept")}</button>
              <button className={`${small} border border-border`} onClick={() => respond(p.friendship_id, false)}>{t("friends.decline")}</button>
            </Row>
          ))}
          {outgoing.length > 0 && <p className="text-xs text-muted-foreground pt-2">{t("friends.sentTitle")}</p>}
          {outgoing.map((p) => <Row key={p.friendship_id} p={p}><span className="text-xs text-muted-foreground">{t("friends.sent")}</span></Row>)}
        </div>
      )}

      {tab === "find" && (
        <div className="space-y-2">
          <input className="input-field" placeholder={t("friends.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
          {q.trim().length >= 2 && found.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{t("friends.noResults")}</p>}
          <div className="divide-y divide-border">
            {found.filter((p) => p.id !== user?.id).map((p) => (
              <Row key={p.id} p={p}>
                {p.friendship === "friends" ? <span className="text-xs text-muted-foreground">{t("friends.isFriend")}</span>
                  : p.friendship === "sent" ? <span className="text-xs text-muted-foreground">{t("friends.sent")}</span>
                  : p.friendship === "received" ? <button className={small} style={accent} onClick={() => add(p.id)}>{t("friends.accept")}</button>
                  : <button className={small} style={accent} onClick={() => add(p.id)}>{t("friends.add")}</button>}
              </Row>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
