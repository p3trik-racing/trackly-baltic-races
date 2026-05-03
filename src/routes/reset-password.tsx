import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Password updated");
  }

  return (
    <main className="min-h-screen container-app py-10">
      <h1 className="text-2xl font-semibold mb-6">Set a new password</h1>
      {done ? (
        <a href="/login" className="cta-button">Back to login</a>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="input-field" type="password" placeholder="New password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="cta-button">Update password</button>
        </form>
      )}
    </main>
  );
}
