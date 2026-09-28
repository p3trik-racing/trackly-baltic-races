export const CATEGORIES = [
  { value: "track_days", label: "Track Day" },
  { value: "drift", label: "Drift" },
  { value: "snow_drift", label: "Ice Drifting" },
  { value: "majorka_special", label: "Majorka Special" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
