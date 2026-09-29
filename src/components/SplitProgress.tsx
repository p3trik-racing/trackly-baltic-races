import { useLang } from "@/i18n";
import { formatDate } from "@/lib/format";
import { eur, perSpot, type Slot } from "@/lib/tracks";

export function SplitProgress({ s, taken }: { s: Slot; taken: number }) {
  const { t, lang } = useLang();
  return (
    <div className="space-y-1">
      <p className="text-xs">{t("slot.joinLine", { price: eur(perSpot(s)), taken, max: s.max_cars, min: s.min_cars, deadline: formatDate(s.split_deadline, lang, "dateTime") })}</p>
      <div className="h-2 rounded-full bg-input overflow-hidden relative">
        <div className="h-full" style={{ width: `${Math.min(100, (taken / s.max_cars) * 100)}%`, backgroundColor: taken >= s.min_cars ? "var(--success)" : "var(--accent)" }} />
        <span className="absolute top-0 bottom-0 w-px bg-foreground/60" style={{ left: `${(s.min_cars / s.max_cars) * 100}%` }} />
      </div>
    </div>
  );
}

