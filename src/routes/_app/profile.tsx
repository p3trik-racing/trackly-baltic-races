import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

interface Profile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_organiser: boolean;
}

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data as any));
  }, [user]);

  async function toggleOrganiser() {
    if (!user || !profile) return;
    const next = !profile.is_organiser;
    const { error } = await supabase.from("profiles").update({ is_organiser: next }).eq("id", user.id);
    if (error) return toast.error(error.message);
    setProfile({ ...profile, is_organiser: next });
    toast.success(next ? "Organiser mode enabled" : "Switched to user mode");
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <main className="container-app py-6 space-y-6">
      <h1 className="text-[22px] font-semibold">Profile</h1>

      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--input)" }}>
          <User size={28} className="text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium">{profile?.full_name || "—"}</p>
          <p className="text-sm text-muted-foreground truncate">{profile?.email || user?.email}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-medium text-sm">Organiser mode</p>
          <p className="text-xs text-muted-foreground mt-1">
            Post and manage your own motorsport events.
          </p>
        </div>
        <button
          onClick={toggleOrganiser}
          className="w-full h-11 rounded-xl text-sm font-medium border"
          style={{
            backgroundColor: profile?.is_organiser ? "var(--accent)" : "transparent",
            borderColor: "var(--accent)",
            color: profile?.is_organiser ? "#fff" : "var(--accent)",
          }}
        >
          {profile?.is_organiser ? "Organiser mode is ON" : "Switch to organiser mode"}
        </button>
        {profile?.is_organiser && (
          <p className="text-xs text-muted-foreground">
            Tools to post and manage events are coming in the next update.
          </p>
        )}
      </div>

      <button onClick={logout} className="w-full h-12 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-muted-foreground">
        <LogOut size={16} /> Log out
      </button>
    </main>
  );
}
