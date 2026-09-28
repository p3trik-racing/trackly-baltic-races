import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
let wired = false;

function isRefusedContext() {
  const h = window.location.hostname;
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
  return (
    !import.meta.env.PROD ||
    inIframe ||
    h.startsWith("id-preview--") || h.startsWith("preview--") ||
    h === "lovableproject.com" || h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off"
  );
}

/** Call once on the client. Registers the pass-through /sw.js in production only and captures the install prompt. */
export function initPwa() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((l) => l()); });

  if (!("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => { if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister(); })).catch(() => {});
    return;
  }
  const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

export function useInstallState() {
  const [, force] = useState(0);
  const [env, setEnv] = useState({ standalone: false, ios: false });
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
    setEnv({ standalone, ios });
    return () => { listeners.delete(l); };
  }, []);
  return {
    ...env,
    canPrompt: !!deferred,
    async prompt() {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      force((n) => n + 1);
    },
  };
}
