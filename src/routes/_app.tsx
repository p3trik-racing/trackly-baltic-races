import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const [isOrganiser, setIsOrganiser] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = () =>
      supabase.from("profiles").select("is_organiser").eq("id", user.id).maybeSingle()
        .then(({ data }) => setIsOrganiser(!!data?.is_organiser));
    load();
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => setIsOrganiser(!!payload.new?.is_organiser))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      <BottomNav isOrganiser={isOrganiser} />
    </div>
  );
}
