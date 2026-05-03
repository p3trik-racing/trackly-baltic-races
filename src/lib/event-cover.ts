import trackday from "@/assets/event-trackday.jpg";
import drift from "@/assets/event-drift.jpg";
import race from "@/assets/event-race.jpg";
import meet from "@/assets/event-meet.jpg";
import snow from "@/assets/event-snow.jpg";
import festival from "@/assets/event-festival.jpg";

const map: Record<string, string> = {
  track_days: trackday,
  drift: drift,
  races: race,
  car_meets: meet,
  snow_drift: snow,
  festivals: festival,
};

export function eventCover(category: string, url?: string | null) {
  // If a hosted URL was provided, use it; otherwise pick by category.
  if (url && /^https?:\/\//.test(url)) return url;
  return map[category] ?? trackday;
}
