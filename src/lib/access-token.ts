import { supabase } from "@/integrations/supabase/client";

/** Current session access token for server-side email functions (null when signed out). */
export async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Fire-and-forget: never blocks or breaks the UI. */
export function fireAndForget(fn: (token: string) => Promise<unknown>) {
  accessToken().then((t) => (t ? fn(t) : null)).catch((e) => console.warn("[email]", e));
}
