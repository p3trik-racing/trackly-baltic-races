export type Round = { date?: string; venue?: string };

export function nextRound(rounds: Round[] | null | undefined): Round | null {
  const list = Array.isArray(rounds) ? rounds : [];
  if (!list.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  return list.find((r) => (r.date ?? "") >= today) ?? list[0];
}

export const HELP_OPTIONS = ["licence", "car_prep", "co_driver", "entry_payment"] as const;
