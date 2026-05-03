import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/home" });
  }

  async function onReset() {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Reset email sent");
  }

  return (
    <main className="min-h-screen container-app py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft size={20} /> Back
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
      <p className="text-muted-foreground text-sm mb-6">Log in to continue</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input-field" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input className="input-field" type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        <button className="cta-button" disabled={loading}>{loading ? "Signing in…" : "Log in"}</button>
      </form>
      <button onClick={onReset} className="block mx-auto mt-4 text-sm" style={{ color: "var(--accent)" }}>
        Forgot your password?
      </button>
      <p className="text-center text-sm text-muted-foreground mt-6">
        New to Trackly? <Link to="/signup" style={{ color: "var(--accent)" }}>Create an account</Link>
      </p>
    </main>
  );
}
