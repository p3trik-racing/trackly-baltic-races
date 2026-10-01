import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useLang, catLabel, LANGS } from "@/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES, SPECIAL } from "@/lib/categories";
import { LogOut, User, Upload, ChevronRight, KeyRound, Globe, ShoppingBag, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAccount } from "@/lib/account.functions";
import { ImageCropModal } from "@/components/ImageCropModal";
import { useTheme } from "@/lib/theme-context";
import { useRoles } from "@/lib/roles";
import { useInstallState } from "@/lib/pwa";
import { Smartphone } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [
    { title: "Profile — Majorka Racing" },
    { name: "description", content: "Manage your Majorka Racing account and preferences." },
    { property: "og:title", content: "Profile — Majorka Racing" },
    { property: "og:description", content: "Manage your Majorka Racing account and preferences." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProfilePage,
});

interface Profile {
  full_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_organiser: boolean;
  favourite_categories: string[];
  event_reminders: boolean;
  booking_confirmations: boolean;
  notify_followed: boolean;
  notify_favourites: boolean;
  notify_organiser_messages: boolean;
}

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLang();
  const tr = t;
  const roles = useRoles();
  const [application, setApplication] = useState<{ status: string; admin_note: string | null } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [followingList, setFollowingList] = useState<{ id: string; name: string }[]>([]);
  const install = useInstallState();
  const [iosSheet, setIosSheet] = useState(false);
  const [saved, setSaved] = useState<{ full_name: string | null; username: string | null; email: string | null } | null>(null);

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/login" }); return; }
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setProfile(data as any);
        if (data) setSaved({ full_name: (data as any).full_name, username: (data as any).username, email: (data as any).email });
      });
    supabase.from("organiser_applications").select("status,admin_note").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setApplication(data));
    (async () => {
      const { data: fs } = await supabase.from("follows").select("organiser_id").eq("user_id", user.id);
      const ids = (fs ?? []).map((f: any) => f.organiser_id as string);
      if (!ids.length) { setFollowingList([]); return; }
      const { data: evs } = await supabase.from("events").select("organiser_id,organiser_name").in("organiser_id", ids);
      const names: Record<string, string> = {};
      (evs ?? []).forEach((e: any) => { if (e.organiser_name && !names[e.organiser_id]) names[e.organiser_id] = e.organiser_name; });
      setFollowingList(ids.map((id) => ({ id, name: names[id] ?? "—" })));
    })();
  }, [user, loading, navigate]);

  async function unfollow(id: string) {
    if (!user) return;
    const { error } = await supabase.from("follows").delete().eq("user_id", user.id).eq("organiser_id", id);
    if (error) return toast.error(error.message);
    setFollowingList((l) => l.filter((x) => x.id !== id));
  }

  async function saveInfo() {
    if (!user || !profile) return;
    setSavingInfo(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: profile.full_name, phone: profile.phone })
      .eq("id", user.id);
    setSavingInfo(false);
    if (error) return toast.error(error.message);
    setSaved((s) => ({ ...(s ?? { username: profile.username, email: profile.email }), full_name: profile.full_name }));
    toast.success(t("profile.infoSaved"));
  }

  async function redeemCode() {
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_organiser_code", { _code: code.trim() });
    setRedeeming(false);
    if (error) return toast.error(error.message);
    if (data) {
      toast.success(t("profile.codeSuccess"));
      setCode(""); setShowCode(false);
      roles.refresh();
    } else toast.error(t("profile.codeInvalid"));
  }

  async function toggleCategory(value: string) {
    if (!user || !profile) return;
    const has = profile.favourite_categories.includes(value);
    const next = has
      ? profile.favourite_categories.filter((c) => c !== value && c !== SPECIAL)
      : [...profile.favourite_categories.filter((c) => c !== SPECIAL), value];
    setProfile({ ...profile, favourite_categories: next });
    await supabase.from("profiles").update({ favourite_categories: next }).eq("id", user.id);
  }

  async function setNotif(
    field: "event_reminders" | "booking_confirmations" | "notify_followed" | "notify_favourites" | "notify_organiser_messages",
    value: boolean,
  ) {
    if (!user || !profile) return;
    setProfile({ ...profile, [field]: value });
    await supabase.from("profiles").update({ [field]: value } as any).eq("id", user.id);
  }

  function openFilePicker(onFile: (file: File) => void, accept: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) onFile(file);
    };
    input.click();
  }

  function onPickAvatar(file: File) {
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function uploadCroppedAvatar(blob: Blob) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) { setUploading(false); closeCrop(); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
    setUploading(false);
    closeCrop();
    if (dbErr) return toast.error(dbErr.message);
    setProfile((p) => p ? { ...p, avatar_url: pub.publicUrl } : p);
    toast.success(t("profile.photoUpdated"));
  }

  async function changePassword() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success(t("profile.passwordResetSent"));
  }

  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState("");
  const [deleting, setDeleting] = useState(false);
  async function deleteAccount() {
    if (delText.trim() !== "DELETE") return;
    setDeleting(true);
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) { setDeleting(false); return; }
    try {
      const r = await deleteMyAccount({ data: { accessToken: token } });
      if (!r.ok) {
        setDeleting(false);
        if (r.reason === "admin") return toast.error(t("profile.delete.admin"));
        if (r.reason === "paid_upcoming") return toast.error(t("profile.delete.paidUpcoming"));
        return toast.error(t("profile.delete.failed"));
      }
      await supabase.auth.signOut().catch(() => {});
      toast.success(t("profile.delete.done"));
      navigate({ to: "/" });
    } catch {
      setDeleting(false);
      toast.error(t("profile.delete.failed"));
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!profile) {
    return <div className="container-app py-10 text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <main className="container-app py-6 space-y-6">
      <h1 className="text-[22px] font-semibold">{t("profile.title")}</h1>

      {/* Avatar */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: "var(--input)" }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={t("profile.avatarAlt")} className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{
            saved?.full_name?.trim() ||
            (saved?.username ? `@${saved.username}` : "") ||
            (saved?.email || user?.email || "").split("@")[0] || "—"
          }</p>
          {saved?.full_name?.trim() && saved?.username && (
            <p className="text-xs text-muted-foreground truncate">@{saved.username}</p>
          )}
          <p className="text-sm text-muted-foreground truncate">{profile.email || user?.email}</p>
        </div>
        <button
          onClick={() => openFilePicker(onPickAvatar, "image/jpeg,image/png,image/webp")}
          className="text-xs px-3 h-9 rounded-lg border border-border inline-flex items-center gap-1.5"
        >
          <Upload size={14} /> {uploading ? "…" : t("profile.upload")}
        </button>
      </div>

      {/* Username */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">{t("profile.username")}</h2>
          {!editingUsername && (
            <button
              onClick={() => { setUsernameDraft(profile.username ?? ""); setEditingUsername(true); }}
              className="text-xs" style={{ color: "var(--accent)" }}>
              {profile.username ? t("profile.editUsername") : t("profile.setUsername")}
            </button>
          )}
        </div>
        {editingUsername ? (
          <div className="flex gap-2">
            <input
              className="input-field"
              value={usernameDraft}
              maxLength={30}
              onChange={(e) => setUsernameDraft(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder={t("profile.usernamePlaceholder")}
            />
            <button
              onClick={async () => {
                if (!user) return;
                if (!/^[a-z0-9_]{3,30}$/.test(usernameDraft)) return toast.error(t("profile.usernameHint"));
                const { error } = await supabase.from("profiles").update({ username: usernameDraft }).eq("id", user.id);
                if (error) return toast.error(error.message.includes("duplicate") ? t("profile.usernameTaken") : error.message);
                setProfile((p) => p ? { ...p, username: usernameDraft } : p);
                setSaved((s) => s ? { ...s, username: usernameDraft } : s);
                setEditingUsername(false);
                toast.success(t("profile.usernameUpdated"));
              }}
              className="px-4 h-12 rounded-xl text-sm font-medium text-accent-foreground"
              style={{ backgroundColor: "var(--accent)" }}>{t("common.save")}</button>
            <button onClick={() => setEditingUsername(false)}
              className="px-3 h-12 rounded-xl text-sm border border-border">{t("common.cancel")}</button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{profile.username ? `@${profile.username}` : t("profile.notSet")}</p>
        )}
      </div>
      {/* Personal Info */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-medium">{t("profile.personalInfo")}</h2>
        <div>
          <label className="text-xs text-muted-foreground">{t("profile.fullName")}</label>
          <input className="input-field mt-1" value={profile.full_name ?? ""}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t("profile.email")}</label>
          <input className="input-field mt-1 opacity-70" value={profile.email ?? user?.email ?? ""} readOnly />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t("profile.phone")}</label>
          <input className="input-field mt-1" value={profile.phone ?? ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </div>
        <button onClick={saveInfo} disabled={savingInfo} className="cta-button">
          {savingInfo ? t("common.saving") : t("profile.saveChanges")}
        </button>
      </section>

      <MyCompetitions userId={user?.id} />

      {/* Preferences */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-medium">{t("profile.preferences")}</h2>
        <div>
          <p className="text-xs text-muted-foreground mb-2">{t("profile.favouriteCategories")}</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.value !== SPECIAL).map((c) => {
              const active = profile.favourite_categories.includes(c.value);
              return (
                <button key={c.value} onClick={() => toggleCategory(c.value)}
                  className="px-3 h-8 rounded-full text-xs font-medium border transition-colors"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    backgroundColor: active ? "color-mix(in oklab, var(--accent) 20%, transparent)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted-foreground)",
                  }}>
                  {catLabel(t, c.value)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">{t("profile.notifications")}</p>
          <ToggleRow label={t("profile.eventReminders")} checked={profile.event_reminders}
            onChange={(v) => setNotif("event_reminders", v)} />
          <ToggleRow label={t("profile.bookingConfirmations")} checked={profile.booking_confirmations}
            onChange={(v) => setNotif("booking_confirmations", v)} />
          <ToggleRow label={t("profile.notifyFollowed")} checked={profile.notify_followed ?? true}
            onChange={(v) => setNotif("notify_followed", v)} />
          <ToggleRow label={t("profile.notifyFavourites")} checked={profile.notify_favourites ?? true}
            onChange={(v) => setNotif("notify_favourites", v)} />
          <ToggleRow label={t("profile.notifyOrganiserMessages")} checked={profile.notify_organiser_messages ?? true}
            onChange={(v) => setNotif("notify_organiser_messages", v)} />
          {followingList.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">{t("profile.followingList", { count: followingList.length })}</p>
              {followingList.map((f) => (
                <div key={f.id} className="flex items-center justify-between">
                  <span className="text-sm truncate">{f.name}</span>
                  <button onClick={() => unfollow(f.id)} className="text-xs px-3 h-8 rounded-full border border-border text-muted-foreground">
                    {t("profile.unfollow")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">{t("profile.appearance")}</p>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((th) => {
              const active = theme === th;
              return (
                <button
                  key={th}
                  onClick={() => { if (!active) toggleTheme(); }}
                  className="flex-1 h-10 rounded-full text-xs font-medium border"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    backgroundColor: active ? "var(--accent)" : "transparent",
                     color: active ? "var(--accent-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {tr(`profile.theme.${th}`)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground pt-2">{tr("profile.language")}</p>
          <div className="flex gap-2">
            {LANGS.map((l) => {
              const active = lang === l;
              return (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="flex-1 h-10 rounded-full text-xs font-medium border"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    backgroundColor: active ? "var(--accent)" : "transparent",
                    color: active ? "var(--accent-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {l.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Organiser */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-medium text-sm">{t("profile.organiserMode")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("profile.organiserHelp")}
          </p>
        </div>
        {roles.blocked ? (
          <p className="text-sm rounded-xl p-3 border" style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}>
            {t("profile.blockedNotice")}
          </p>
        ) : roles.isOrganiser ? (
          <Link to="/organiser" className="cta-button">{t("profile.goToOrganiser")}</Link>
        ) : (
          <>
            {application?.status === "pending" ? (
              <p className="text-sm text-muted-foreground border border-border rounded-xl p-3">{t("profile.appPending")}</p>
            ) : (
              <>
                {application?.status === "rejected" && (
                  <div className="text-sm border border-border rounded-xl p-3">
                    <p>{t("profile.appRejected")}</p>
                    {application.admin_note && <p className="text-xs text-muted-foreground mt-1">{application.admin_note}</p>}
                  </div>
                )}
                <Link to="/organiser/apply" className="w-full h-11 rounded-xl text-sm font-medium border inline-flex items-center justify-center"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  {t("profile.applyOrganiser")}
                </Link>
              </>
            )}
            {!showCode ? (
              <button onClick={() => setShowCode(true)} className="w-full text-xs text-muted-foreground underline">
                {t("profile.haveCode")}
              </button>
            ) : (
              <div className="flex gap-2">
                <input className="input-field" value={code} placeholder={t("profile.codePlaceholder")}
                  onChange={(e) => setCode(e.target.value.toUpperCase())} />
                <button onClick={redeemCode} disabled={!code.trim() || redeeming}
                  className="px-4 h-12 rounded-xl text-sm font-medium text-accent-foreground disabled:opacity-50"
                  style={{ backgroundColor: "var(--accent)" }}>{t("profile.unlock")}</button>
              </div>
            )}
          </>
        )}
        {roles.isAdmin && (
          <Link to="/admin" className="block text-sm font-medium" style={{ color: "var(--accent)" }}>{t("profile.adminPanel")}</Link>
        )}
      </section>

      {!install.standalone && (install.canPrompt || install.ios) && (
        <section className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <Smartphone size={20} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t("profile.install")}</p>
            <p className="text-xs text-muted-foreground">{install.ios ? t("profile.installIos") : t("profile.installHelp")}</p>
          </div>
          {(install.canPrompt || install.ios) && (
            <button onClick={() => (install.ios ? setIosSheet(true) : install.prompt())} className="px-4 h-9 rounded-xl text-sm font-medium text-accent-foreground"
              style={{ backgroundColor: "var(--accent)" }}>{t("profile.installButton")}</button>
          )}
        </section>
      )}

      {iosSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/60" role="dialog" aria-modal="true" onClick={() => setIosSheet(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-t-2xl p-5 pb-8 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium">{t("ios.title")}</p>
            {install.safari ? (
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>{t("ios.step1")}</li><li>{t("ios.step2")}</li><li>{t("ios.step3")}</li>
              </ol>
            ) : (
              <p className="text-sm">{t("ios.openSafari")}</p>
            )}
            <button onClick={() => setIosSheet(false)} className="w-full h-11 rounded-xl border border-border text-sm">{t("common.close")}</button>
          </div>
        </div>
      )}

      {/* Friends & privacy */}
      <section className="bg-card border border-border rounded-2xl p-2">
        <Link to="/friends" className="w-full flex items-center justify-between px-3 h-12 text-sm">
          <span className="inline-flex items-center gap-2"><Users size={16} /> {t("friends.title")}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
        <div className="px-3 pb-3 pt-1 space-y-2">
          <p className="text-xs text-muted-foreground">{t("profile.privacy")}</p>
          <ToggleRow label={t("profile.showAttendance")} checked={(profile as any).show_attendance ?? true}
            onChange={async (v) => { if (!user) return; setProfile({ ...profile, show_attendance: v } as any); await supabase.from("profiles").update({ show_attendance: v }).eq("id", user.id); }} />
        </div>
      </section>

      {/* Majorka */}
      <section className="bg-card border border-border rounded-2xl p-2">
        <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">{t("profile.majorka")}</p>
        <a href="https://majorkariga.com" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3 h-12 text-sm">
          <span className="inline-flex items-center gap-2"><Globe size={16} /> {t("profile.communitySite")}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </a>
        <a href="https://majorkashop.com" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3 h-12 text-sm">
          <span className="inline-flex items-center gap-2"><ShoppingBag size={16} /> {t("profile.shop")}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </a>
      </section>

      {/* Account */}
      <section className="bg-card border border-border rounded-2xl p-2">
        <button onClick={changePassword}
          className="w-full flex items-center justify-between px-3 h-12 text-sm">
          <span className="inline-flex items-center gap-2"><KeyRound size={16} /> {t("profile.changePassword")}</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </section>

      <button onClick={logout} className="w-full h-12 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground">
        <LogOut size={16} /> {t("profile.logout")}
      </button>

      <button onClick={() => { setDelText(""); setDelOpen(true); }}
        className="w-full text-center text-sm font-medium py-4"
        style={{ color: "var(--accent)" }}>
        {t("profile.deleteAccount")}
      </button>
      {delOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 p-4" role="dialog" aria-modal="true" aria-labelledby="del-title">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 id="del-title" className="text-lg font-semibold">{t("profile.deleteAccount")}</h2>
            <p className="text-sm text-muted-foreground">{t("profile.delete.body")}</p>
            <label htmlFor="del-input" className="block text-xs text-muted-foreground">{t("profile.delete.typeHint")}</label>
            <input id="del-input" className="input-field" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="DELETE" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDelOpen(false)} disabled={deleting} className="flex-1 h-11 rounded-xl border border-border text-sm">{t("common.cancel")}</button>
              <button onClick={deleteAccount} disabled={deleting || delText.trim() !== "DELETE"}
                className="flex-1 h-11 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground disabled:opacity-50">
                {deleting ? t("profile.delete.deleting") : t("profile.delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          onConfirm={uploadCroppedAvatar}
          onCancel={closeCrop}
        />
      )}
    </main>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className="relative w-11 h-6 rounded-full transition-colors"
        style={{ backgroundColor: checked ? "var(--accent)" : "var(--input)" }}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}

function MyCompetitions({ userId }: { userId?: string }) {
  const { t } = useLang();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from("competition_entries").select("id,status,created_at,competitions(name,slug)")
      .eq("user_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [userId]);
  if (!rows.length) return null;
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <h2 className="font-medium">{t("profile.myCompetitions")}</h2>
      {rows.map((r) => (
        <Link key={r.id} to="/competitions/$slug" params={{ slug: r.competitions?.slug ?? "" }}
          className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate">{r.competitions?.name ?? "—"}</span>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            {t(`compete.status.${r.status}` as any)}
          </span>
        </Link>
      ))}
    </section>
  );
}
