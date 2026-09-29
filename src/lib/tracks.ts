export interface PriceRule { id?: string; venue_id?: string; days: number[]; start_time: string; end_time: string; price_per_hour: number; label: string | null }
export interface Slot {
  id: string; venue_id: string; date: string; start_time: string; end_time: string; price_total: number;
  min_cars: number; max_cars: number; per_spot_price: number | null; status: string; host_id: string | null;
  split_deadline: string | null; host_gap: number | null; notes: string | null;
}

export const hhmm = (t: string | null | undefined) => (t ? String(t).slice(0, 5) : "");
export const slotStart = (s: Pick<Slot, "date" | "start_time">) => new Date(`${s.date}T${hhmm(s.start_time)}:00`);
export const perSpot = (s: Pick<Slot, "per_spot_price" | "price_total" | "max_cars">) =>
  Math.ceil(Number(s.per_spot_price ?? Number(s.price_total) / Math.max(1, s.max_cars)) * 100) / 100;
export const eur = (n: number) => `€${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`;

const LOCALES: Record<string, string> = { en: "en-GB", ru: "ru-RU", lv: "lv-LV" };
/** ISO weekday 1=Mon..7=Sun, localised short name. */
export function dayName(iso: number, lang: string) {
  const d = new Date(2024, 0, iso); // 2024-01-01 is Monday
  return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-GB", { weekday: "short" }).format(d);
}
export function daysLabel(days: number[], lang: string) {
  const s = [...days].sort((a, b) => a - b);
  if (!s.length) return "";
  const contiguous = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  if (contiguous && s.length > 2) return `${dayName(s[0], lang)}–${dayName(s[s.length - 1], lang)}`;
  return s.map((d) => dayName(d, lang)).join(", ");
}
export function isoDay(date: string) { const d = new Date(`${date}T00:00:00`).getDay(); return d === 0 ? 7 : d; }

const mins = (t: string) => { const [h, m] = hhmm(t).split(":").map(Number); return h * 60 + (m || 0); };

/** Price from matching rules × hours, in 15-minute steps. Returns null if any part is uncovered. */
export function calcPrice(rules: PriceRule[], date: string, from: string, to: string): number | null {
  if (!date || !from || !to) return null;
  const day = isoDay(date);
  let total = 0;
  for (let m = mins(from); m < mins(to); m += 15) {
    const r = rules.find((r) => r.days.includes(day) && mins(r.start_time) <= m && mins(r.end_time) > m);
    if (!r) return null;
    total += Number(r.price_per_hour) / 4;
  }
  return Math.round(total * 100) / 100;
}

export const SLOT_COLORS: Record<string, string> = {
  open: "var(--success)",
  split_open: "oklch(0.78 0.15 75)",
  booked: "var(--muted-foreground)",
  confirmed: "var(--muted-foreground)",
  cancelled: "var(--border)",
};

export const VENUE_REQS = ["helmet", "tech_ok", "sound_limit", "driver_only", "studded_tyres", "rwd_only"] as const;
