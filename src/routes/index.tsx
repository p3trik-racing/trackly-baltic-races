import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Flag } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) navigate({ to: "/home" });
  }, [user, loading, navigate]);

  if (loading || user) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center container-app text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Flag size={40} color="#fff" strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Trackly</h1>
        <p className="mt-3 text-muted-foreground text-base max-w-xs">
          Find and book legal motorsport events in the Baltics
        </p>
      </div>
      <div className="container-app pb-10 space-y-3">
        <Link to="/signup" className="cta-button">Sign Up</Link>
        <Link
          to="/login"
          className="cta-button"
          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          Log In
        </Link>
        <p className="text-center text-muted-foreground pt-2" style={{ fontSize: "11px" }}>
          By using Trackly you agree to our{" "}
          <Link to="/terms" style={{ color: "var(--accent)" }}>Terms of Service</Link>
          {" "}and{" "}
          <Link to="/privacy-policy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
