import { createMiddleware, createStart } from "@tanstack/react-start";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://m.stripe.network https://r.stripe.com https://tiles.openfreemap.org https://photon.komoot.io https://server.arcgisonline.com https://*.lovable.app https://*.lovable.dev",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// The Lovable editor shows preview builds inside an iframe; only the framing headers are relaxed there.
const isPreviewHost = (h: string) => /(^|\.)id-preview--|lovableproject\.com$|^localhost|^127\./.test(h);

const securityHeaders = createMiddleware().server(async ({ next, request }) => {
  const result = await next();
  const res: Response | undefined = (result as any)?.response;
  if (!res || !import.meta.env.PROD) return result;
  const host = new URL(request.url).hostname;
  const h = res.headers;
  try {
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Permissions-Policy", 'camera=(self), geolocation=(self), microphone=(), payment=(self "https://js.stripe.com")');
    if (isPreviewHost(host)) {
      h.set("Content-Security-Policy", CSP.replace("; frame-ancestors 'none'", ""));
    } else {
      h.set("X-Frame-Options", "DENY");
      h.set("Content-Security-Policy", CSP);
    }
  } catch {
    // immutable headers (e.g. proxied responses) — leave untouched
  }
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}));
