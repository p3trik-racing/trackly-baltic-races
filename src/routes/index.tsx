import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

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
        <div className="bg-white rounded-2xl p-5 flex items-center justify-center mx-auto mb-8" style={{ width: "240px" }}>
          <img src="/trackly-logo.png" alt="Trackly" className="w-full h-auto object-contain" />
        </div>
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
        <Link
          to="/home"
          className="block text-center text-sm text-muted-foreground py-3"
        >
          Browse events without signing up →
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
