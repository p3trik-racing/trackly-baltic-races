import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Flag } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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

      <div className="flex flex-col items-center mb-8 mt-2">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Flag size={28} color="#fff" strokeWidth={2.5} />
        </div>
        <h2 className="text-3xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>
          Trackly
        </h2>
      </div>

      <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
      <p className="text-muted-foreground text-sm mb-6">Log in to continue</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input-field" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <div className="relative">
          <input className="input-field pr-12" type={showPw ? "text" : "password"} placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="button" onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-2">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
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
