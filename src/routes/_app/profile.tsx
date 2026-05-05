import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/categories";
import { LogOut, User, Upload, ChevronRight, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { ImageCropModal } from "@/components/ImageCropModal";

export const Route = createFileRoute("/_app/profile")({
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
  

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/login" }); return; }
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data as any));
  }, [user, loading, navigate]);

  async function saveInfo() {
    if (!user || !profile) return;
    setSavingInfo(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: profile.full_name, phone: profile.phone })
      .eq("id", user.id);
    setSavingInfo(false);
    if (error) return toast.error(error.message);
    toast.success("Personal info saved");
  }

  async function toggleOrganiser() {
    if (!user || !profile) return;
    const next = !profile.is_organiser;
    const { error } = await supabase.from("profiles").update({ is_organiser: next }).eq("id", user.id);
    if (error) return toast.error(error.message);
    setProfile({ ...profile, is_organiser: next });
    toast.success(next ? "Organiser mode enabled" : "Switched to user mode");
  }

  async function toggleCategory(value: string) {
    if (!user || !profile) return;
    const has = profile.favourite_categories.includes(value);
    const next = has
      ? profile.favourite_categories.filter((c) => c !== value)
      : [...profile.favourite_categories, value];
    setProfile({ ...profile, favourite_categories: next });
    await supabase.from("profiles").update({ favourite_categories: next }).eq("id", user.id);
  }

  async function setNotif(field: "event_reminders" | "booking_confirmations", value: boolean) {
    if (!user || !profile) return;
    setProfile({ ...profile, [field]: value });
    const patch = field === "event_reminders"
      ? { event_reminders: value }
      : { booking_confirmations: value };
    await supabase.from("profiles").update(patch).eq("id", user.id);
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
    toast.success("Photo updated");
  }

  async function changePassword() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  }

  async function deleteAccount() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    // Account deletion requires admin privileges; sign out and notify.
    await supabase.auth.signOut();
    toast.message("Account deletion requested. Please contact support to permanently delete your data.");
    navigate({ to: "/" });
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!profile) {
    return <div className="container-app py-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <main className="container-app py-6 space-y-6">
      <h1 className="text-[22px] font-semibold">Profile</h1>

      {/* Avatar */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: "var(--input)" }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{profile.full_name || "—"}</p>
          {profile.username && !editingUsername && (
            <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
          )}
          <p className="text-sm text-muted-foreground truncate">{profile.email || user?.email}</p>
        </div>
        <button
          onClick={() => openFilePicker(onPickAvatar, "image/jpeg,image/png,image/webp")}
          className="text-xs px-3 h-9 rounded-lg border border-border inline-flex items-center gap-1.5"
        >
          <Upload size={14} /> {uploading ? "…" : "Upload"}
        </button>
      </div>

      {/* Username */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Username</h2>
          {!editingUsername && (
            <button
              onClick={() => { setUsernameDraft(profile.username ?? ""); setEditingUsername(true); }}
              className="text-xs" style={{ color: "var(--accent)" }}>
              {profile.username ? "Edit username" : "Set username"}
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
              placeholder="username"
            />
            <button
              onClick={async () => {
                if (!user) return;
                if (!/^[a-z0-9_]{3,30}$/.test(usernameDraft)) return toast.error("3-30 chars · letters, numbers, underscore");
                const { error } = await supabase.from("profiles").update({ username: usernameDraft }).eq("id", user.id);
                if (error) return toast.error(error.message.includes("duplicate") ? "Username taken" : error.message);
                setProfile((p) => p ? { ...p, username: usernameDraft } : p);
                setEditingUsername(false);
                toast.success("Username updated");
              }}
              className="px-4 h-12 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: "var(--accent)" }}>Save</button>
            <button onClick={() => setEditingUsername(false)}
              className="px-3 h-12 rounded-xl text-sm border border-border">Cancel</button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{profile.username ? `@${profile.username}` : "Not set"}</p>
        )}
      </div>
      {/* Personal Info */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-medium">Personal info</h2>
        <div>
          <label className="text-xs text-muted-foreground">Full name</label>
          <input className="input-field mt-1" value={profile.full_name ?? ""}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <input className="input-field mt-1 opacity-70" value={profile.email ?? user?.email ?? ""} readOnly />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Phone number</label>
          <input className="input-field mt-1" value={profile.phone ?? ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </div>
        <button onClick={saveInfo} disabled={savingInfo} className="cta-button">
          {savingInfo ? "Saving…" : "Save changes"}
        </button>
      </section>

      {/* Preferences */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-medium">Preferences</h2>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Favourite categories</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = profile.favourite_categories.includes(c.value);
              return (
                <button key={c.value} onClick={() => toggleCategory(c.value)}
                  className="px-3 h-8 rounded-full text-xs font-medium border transition-colors"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    backgroundColor: active ? "color-mix(in oklab, var(--accent) 20%, transparent)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted-foreground)",
                  }}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">Notifications</p>
          <ToggleRow label="Event reminders" checked={profile.event_reminders}
            onChange={(v) => setNotif("event_reminders", v)} />
          <ToggleRow label="Booking confirmations" checked={profile.booking_confirmations}
            onChange={(v) => setNotif("booking_confirmations", v)} />
        </div>
      </section>

      {/* Organiser */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-medium text-sm">Organiser mode</p>
          <p className="text-xs text-muted-foreground mt-1">
            Post and manage your own motorsport events.
          </p>
        </div>
        {profile.is_organiser ? (
          <>
            <Link to="/organiser" className="cta-button">Go to Organiser Dashboard →</Link>
            <button
              onClick={toggleOrganiser}
              className="w-full h-11 rounded-xl text-sm font-medium border border-border text-muted-foreground"
            >
              Switch off organiser mode
            </button>
          </>
        ) : (
          <button
            onClick={toggleOrganiser}
            className="w-full h-11 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Switch to organiser mode
          </button>
        )}
      </section>

      {/* Account */}
      <section className="bg-card border border-border rounded-2xl p-2">
        <button onClick={changePassword}
          className="w-full flex items-center justify-between px-3 h-12 text-sm">
          <span className="inline-flex items-center gap-2"><KeyRound size={16} /> Change password</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </section>

      <button onClick={logout} className="w-full h-12 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground">
        <LogOut size={16} /> Log out
      </button>

      <button onClick={deleteAccount}
        className="w-full text-center text-sm font-medium py-4"
        style={{ color: "var(--accent)" }}>
        Delete account
      </button>
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
