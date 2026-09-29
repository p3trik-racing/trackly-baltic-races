import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { LanguageProvider, useLang, FirstLanguageSheet } from "@/i18n";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";
import { useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { initPwa } from "@/lib/pwa";

function LangSheetGate() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return path === "/" || path === "/home" ? <FirstLanguageSheet /> : null;
}

function PwaInit() {
  useEffect(() => { initPwa(); }, []);
  return null;
}

const themeInitScript = `(function(){try{var s=localStorage.getItem('majorka-theme');var t=s==='light'||s==='dark'?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("notFound.body")}
        </p>
        <Link to="/" className="mt-6 inline-flex cta-button max-w-xs">{t("notFound.home")}</Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "google", content: "notranslate" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Majorka" },
      { title: "Majorka Racing" },
      {
        name: "description",
        content: "Track days, car meets and motorsport events in Riga and the Baltics — book your spot with Majorka Racing.",
      },
      { property: "og:title", content: "Majorka Racing" },
      { property: "og:description", content: "Track days and motorsport events in the Baltics" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Majorka Racing" },
      { name: "twitter:title", content: "Majorka Racing" },
      { name: "twitter:description", content: "Track days and motorsport events in the Baltics" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: () => (
    <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
        <InAppBrowserBanner />
        <Outlet />
        <LangSheetGate />
        <Toaster />
        <PwaInit />
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  ),
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
