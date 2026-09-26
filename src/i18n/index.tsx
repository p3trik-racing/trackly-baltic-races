import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { en, type TranslationKey } from "./en";
import { ru } from "./ru";
import { lv } from "./lv";

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

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: TFn }>({
  lang: "en",
  setLang: () => {},
  t: (k, v) => translate("en", k, v),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { setLangState(detectLang()); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch {}
    setLangState(l);
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

const FLAGS: Record<string, string> = { Latvia: "🇱🇻", Estonia: "🇪🇪", Lithuania: "🇱🇹" };
/** Translated country label with flag; unknown values pass through. */
export function countryName(t: TFn, v?: string | null) {
  if (!v) return "";
  const k = `countries.${v}` as TranslationKey;
  return k in en ? `${FLAGS[v]} ${t(k)}` : v;
}
