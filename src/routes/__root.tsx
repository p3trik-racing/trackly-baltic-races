import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";

const themeInitScript = `(function(){try{var s=localStorage.getItem('trackly-theme');var t=s==='light'||s==='dark'?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="mt-6 inline-flex cta-button max-w-xs">Go home</Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0D0D0D" },
      { title: "Trackly — Find motorsport events in the Baltics" },
      {
        name: "description",
        content: "Discover and book legal, organised motorsport events across Latvia and the Baltic States.",
      },
      { property: "og:title", content: "Trackly" },
      { property: "og:description", content: "Find and book legal motorsport events in the Baltics." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  ),
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
