export type DateStyle = "short" | "medium" | "long" | "weekday" | "weekdayShort" | "monthYear" | "dateTime";

/** Capitalise only the start of a standalone heading, never the words inside a date. */
export function ucFirst(s: string): string {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

const LOCALES: Record<string, string> = { en: "en-GB", ru: "ru-RU", lv: "lv-LV" };

const STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: "numeric", month: "short" },
  medium: { day: "numeric", month: "short", year: "numeric" },
  long: { day: "numeric", month: "long", year: "numeric" },
  weekday: { weekday: "long", day: "numeric", month: "long" },
  weekdayShort: { weekday: "short", day: "numeric", month: "short" },
  monthYear: { month: "long", year: "numeric" },
  dateTime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
};

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // Plain YYYY-MM-DD is parsed as local midnight so the day never shifts.
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
}

export function formatDate(date: string | Date | null | undefined, lang: string, style: DateStyle = "medium"): string {
  if (!date) return "";
  const d = toDate(date);
  if (isNaN(d.getTime())) return String(date);
  return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-GB", STYLES[style]).format(d);
}

/** Competition round date: "2026" stays a year, "2027-01" becomes "Jan 2027", full dates are formatted. */
export function formatRoundDate(s: string | null | undefined, lang: string): string {
  if (!s) return "";
  if (/^\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) {
    return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-GB", { month: "short", year: "numeric" }).format(new Date(`${s}-01T00:00:00`));
  }
  return formatDate(s, lang, "medium");
}
