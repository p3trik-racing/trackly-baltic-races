import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { en, type TranslationKey } from "./en";
import { ru } from "./ru";
import { lv } from "./lv";
import { supabase } from "@/integrations/supabase/client";

function saveProfileLang(l: string, userId?: string | null) {
  if (!userId) return;
  // Only write when it actually differs from the stored value.
  supabase.from("profiles").select("lang").eq("id", userId).maybeSingle().then(({ data }) => {
    if (!data || (data as any).lang === l) return;
    supabase.from("profiles").update({ lang: l }).eq("id", userId).then(() => {}, () => {});
  }, () => {});
}

export const LANGS = ["en", "ru", "lv"] as const;
export type Lang = (typeof LANGS)[number];
const STORAGE_KEY = "majorka-lang";
const dicts: Record<Lang, Partial<Record<TranslationKey, string>>> = { en, ru, lv };

type Vars = Record<string, string | number>;
type TFn = (key: TranslationKey, vars?: Vars) => string;

const warned = new Set<string>();

function translate(lang: Lang, key: TranslationKey, vars?: Vars): string {
  let s = dicts[lang][key];
  if (s == null) {
    if (lang !== "en" && !warned.has(`${lang}:${key}`)) {
      warned.add(`${lang}:${key}`);
      console.debug(`[i18n] missing "${key}" for ${lang}, falling back to en`);
    }
    s = en[key];
  }
  if (s == null) {
    if (!warned.has(key)) { warned.add(key); console.warn(`[i18n] missing key "${key}"`); }
    return key;
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

function detectLang(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved as Lang;
  } catch {}
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of list) {
    const x = (l || "").toLowerCase();
    if (x.startsWith("ru")) return "ru";
    if (x.startsWith("lv")) return "lv";
    if (x.startsWith("en")) return "en";
  }
  return "en";
}

export function hasSavedLang() {
  try { return !!window.localStorage.getItem(STORAGE_KEY); } catch { return true; }
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: TFn }>({
  lang: "en",
  setLang: () => {},
  t: (k, v) => translate("en", k, v),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { setLangState(detectLang()); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Persist the UI language on login so emails can use it later.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
      const l = detectLang();
      setTimeout(() => saveProfileLang(l, session?.user?.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setLang = useCallback((l: Lang) => {
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch {}
    setLangState(l);
    supabase.auth.getSession().then(({ data }) => saveProfileLang(l, data.session?.user?.id), () => {});
  }, []);
  const t = useCallback<TFn>((k, v) => translate(lang, k, v), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Small muted "EN · RU · LV" switcher row. */
export function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <p className={`text-center text-xs text-muted-foreground ${className}`}>
      {LANGS.map((l, i) => (
        <span key={l}>
          {i > 0 && " · "}
          <button type="button" onClick={() => setLang(l)}
            className={lang === l ? "text-foreground font-semibold" : "hover:text-foreground"}
            aria-pressed={lang === l}>
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </p>
  );
}

/** Translated category label; unknown values pass through. */
export function catLabel(t: TFn, v: string) {
  const k = `categories.${v}` as TranslationKey;
  return k in en ? t(k) : v;
}

export function hasTranslationKey(key: string): key is TranslationKey {
  return key in en;
}

const FLAGS: Record<string, string> = { Latvia: "🇱🇻", Estonia: "🇪🇪", Lithuania: "🇱🇹" };
/** Translated country label with flag; unknown values pass through. */
export function countryName(t: TFn, v?: string | null) {
  if (!v) return "";
  const k = `countries.${v}` as TranslationKey;
  return k in en ? `${FLAGS[v]} ${t(k)}` : v;
}

const LANG_NAMES: Record<Lang, string> = { en: "English", ru: "Русский", lv: "Latviešu" };

/** One-time bottom sheet shown when no language has been saved yet. */
export function FirstLanguageSheet() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(!hasSavedLang()); }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/60" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl p-5 pb-8 space-y-3">
        <p className="font-medium text-center">{t("lang.choose")}</p>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button key={l} type="button" onClick={() => { setLang(l); setOpen(false); }}
              className="h-11 rounded-xl text-sm border"
              style={lang === l ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>
              {LANG_NAMES[l]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
