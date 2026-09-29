import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/i18n";
import { LogoFull } from "@/components/Logo";
import { Avatar, displayName, type MiniProfile } from "@/components/FriendsGoing";

export const Route = createFileRoute("/_app/invite/$code")({
  validateSearch: (s: Record<string, unknown>): { auto?: number } => (s.auto ? { auto: 1 } : {}),
  head: () => ({ meta: [
    { title: "You're invited — Majorka Racing" },
    { name: "description", content: "Join me on Majorka Racing — track days, drift & ice in the Baltics." },
    { property: "og:title", content: "You're invited — Majorka Racing" },
    { property: "og:description", content: "Join me on Majorka Racing — track days, drift & ice in the Baltics." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const { auto } = Route.useSearch();
  const { user, loading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [inviter, setInviter] = useState<MiniProfile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const autoDone = useRef(false);

  useEffect(() => {
    supabase.rpc("inviter_preview", { _code: code }).then(({ data }) => setInviter(((data as MiniProfile[]) ?? [])[0] ?? null));
  }, [code]);

  async function accept() {
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_invite", { _code: code });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data === "self") toast(t("invite.self"));
    else toast.success(t("invite.added", { name: inviter ? displayName(inviter) : "" }));
    navigate({ to: "/friends" });
  }

  useEffect(() => {
    if (!auto || !user || !inviter || autoDone.current) return;
    const key = `mr-invite-${code}`;
    if (sessionStorage.getItem(key)) return;
    autoDone.current = true;
    sessionStorage.setItem(key, "1");
    accept();
  }, [auto, user, inviter]);

  const back = `/invite/${code}?auto=1`;
  const name = inviter ? displayName(inviter) : "";
  return (
    <main className="container-app py-10 space-y-6 text-center">
      <LogoFull className="w-[160px] h-auto mx-auto text-foreground" />
      {inviter === undefined ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        : inviter === null ? <p className="text-sm text-muted-foreground">{t("invite.invalid")}</p>
        : (
          <>
            <div className="flex flex-col items-center gap-3">
              <Avatar p={inviter} size={72} />
              <p className="text-lg font-semibold">{t("invite.title", { name })}</p>
              <p className="text-sm text-muted-foreground">{t("friends.inviteText")}</p>
            </div>
            {loading ? null : user ? (
              <button onClick={accept} disabled={busy} className="cta-button disabled:opacity-60">{t("invite.add", { name })}</button>
            ) : (
              <div className="space-y-2">
                <Link to="/signup" search={{ redirect: back }} className="cta-button">{t("invite.signup")}</Link>
                <Link to="/login" search={{ redirect: back }} className="block text-sm py-2" style={{ color: "var(--accent)" }}>{t("invite.login")}</Link>
              </div>
            )}
          </>
        )}
    </main>
  );
}
