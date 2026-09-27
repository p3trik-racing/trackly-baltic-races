export const CATEGORIES = [
  { value: "track_days", label: "Track Days" },
  { value: "drift", label: "Drift" },
  { value: "snow_drift", label: "Snow Drift" },
  { value: "races", label: "Races" },
  { value: "car_meets", label: "Car Meets" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
