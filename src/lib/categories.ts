export const CATEGORIES = [
  { value: "majorka_special", label: "Majorka Special" },
  { value: "track_days", label: "Track Day" },
  { value: "drift", label: "Drift Event" },
  { value: "snow_drift", label: "Ice Drifting" },
  { value: "karting", label: "Karting" },
  { value: "races", label: "Races & Competitions" },
] as const;

export const SPECIAL = "majorka_special";

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function orderCategories(favs: string[]) {
  const special = CATEGORIES.filter((c) => c.value === SPECIAL);
  const favourites = CATEGORIES.filter((c) => c.value !== SPECIAL && favs.includes(c.value));
  const rest = CATEGORIES.filter((c) => c.value !== SPECIAL && !favs.includes(c.value));
  return [...favourites, ...special, ...rest];
}

export function orderEvents<T extends { category: string }>(list: T[], selected: string, favs: string[]): T[] {
  if (selected !== "all") return list.filter((item) => item.category === selected);
  const favouriteSet = new Set(favs.filter((category) => category !== SPECIAL));
  return [
    ...list.filter((item) => favouriteSet.has(item.category)),
    ...list.filter((item) => item.category === SPECIAL),
    ...list.filter((item) => item.category !== SPECIAL && !favouriteSet.has(item.category)),
  ];
}
