import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ isAdmin: false, isOrganiser: false, blocked: false, loading: true });

  const refresh = useCallback(async () => {
    if (!user) { setState({ isAdmin: false, isOrganiser: false, blocked: false, loading: authLoading }); return; }
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("blocked").eq("id", user.id).maybeSingle(),
    ]);
    const r = (roles ?? []).map((x) => x.role);
    setState({ isAdmin: r.includes("admin"), isOrganiser: r.includes("organiser"), blocked: !!prof?.blocked, loading: false });
  }, [user, authLoading]);

  useEffect(() => { refresh(); }, [refresh]);
  return { ...state, refresh };
}

/** Redirects to /profile when the user is neither organiser nor admin. */
export function useOrganiserGuard(message: string) {
  const roles = useRoles();
  const navigate = useNavigate();
  useEffect(() => {
    if (roles.loading) return;
    if (!roles.isOrganiser && !roles.isAdmin) {
      toast.error(message);
      navigate({ to: "/profile" });
    }
  }, [roles.loading, roles.isOrganiser, roles.isAdmin, navigate, message]);
  return roles;
}
