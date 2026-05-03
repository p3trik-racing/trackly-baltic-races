export const COUNTRIES = [
  { value: "Latvia", label: "🇱🇻 Latvia" },
  { value: "Estonia", label: "🇪🇪 Estonia" },
  { value: "Lithuania", label: "🇱🇹 Lithuania" },
] as const;

export function countryLabel(v?: string | null) {
  if (!v) return "";
  return COUNTRIES.find((c) => c.value === v)?.label ?? v;
}
