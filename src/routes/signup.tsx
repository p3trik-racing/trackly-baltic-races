import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", username: "", phone: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  const usernameValid = /^[a-z0-9_]{3,30}$/.test(form.username);

  useEffect(() => {
    if (!form.username) { setUsernameStatus("idle"); return; }
    if (!usernameValid) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", form.username).maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 350);
    return () => clearTimeout(t);
  }, [form.username, usernameValid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return toast.error("Please accept the Terms of Service");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!usernameValid) return toast.error("Username must be 3+ chars, letters/numbers/underscore");
    if (usernameStatus === "taken") return toast.error("Username already taken");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.fullName, phone: form.phone, username: form.username.toLowerCase() },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to Trackly!");
    navigate({ to: "/home" });
  }

  return (
    <main className="min-h-screen container-app py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft size={20} /> Back
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
      <p className="text-muted-foreground text-sm mb-6">Join the Baltic motorsport community</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input-field" placeholder="Full name" value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />

        <div className="relative">
          <input className="input-field pr-10" placeholder="Username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
            required minLength={3} maxLength={30} autoComplete="off" />
          {form.username && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === "available" && <Check size={18} className="text-[oklch(0.78_0.16_145)]" />}
              {(usernameStatus === "taken" || usernameStatus === "invalid") && <X size={18} style={{ color: "var(--accent)" }} />}
            </span>
          )}
        </div>
        {form.username && usernameStatus === "invalid" && (
          <p className="text-[11px] -mt-2" style={{ color: "var(--accent)" }}>3-30 chars · letters, numbers, underscore</p>
        )}

        <input className="input-field" type="tel" placeholder="Phone" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input-field" type="email" placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
        <div className="relative">
          <input className="input-field pr-12" type={showPw ? "text" : "password"} placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-2">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground py-2">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-[var(--accent)]" />
          <span>I agree to the Terms of Service and Privacy Policy.</span>
        </label>

        <button className="cta-button" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account? <Link to="/login" style={{ color: "var(--accent)" }}>Log in</Link>
      </p>
    </main>
  );
}
