export type Round = { date?: string; venue?: string };

/** Last day a (possibly partial) round date covers, as YYYY-MM-DD. */
function roundEnd(date?: string): string {
  if (!date) return "";
  if (/^\d{4}$/.test(date)) return `${date}-12-31`;
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-31`;
  return date.slice(0, 10);
}

export function isRoundPast(r: Round): boolean {
  const end = roundEnd(r.date);
  return !!end && end < new Date().toISOString().slice(0, 10);
}

/** First round today or later; null when every round is in the past. */
export function nextRound(rounds: Round[] | null | undefined): Round | null {
  const list = Array.isArray(rounds) ? rounds : [];
  return list.find((r) => !!r.date && !isRoundPast(r)) ?? null;
}

export const HELP_OPTIONS = ["licence", "car_prep", "co_driver", "entry_payment"] as const;

export type CompTextField = "description" | "entry_fee" | "licence" | "car_requirements" | "how_to_enter" | "season";
/** Translated competition text from the i18n jsonb column, falling back to the English column. */
export function ctext(c: any, field: CompTextField, lang: string): string | null {
  const v = lang !== "en" ? c?.i18n?.[lang]?.[field] : null;
  return (typeof v === "string" && v.trim()) ? v : (c?.[field] ?? null);
}
