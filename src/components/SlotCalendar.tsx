import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/i18n";
import { formatDate } from "@/lib/format";
import { dayName, SLOT_COLORS, type Slot } from "@/lib/tracks";

const pad = (n: number) => String(n).padStart(2, "0");

/** Month grid; dots per day coloured by slot status. */
export function SlotCalendar({ slots, selected, onSelect }: { slots: Pick<Slot, "date" | "status">[]; selected: string | null; onSelect: (d: string) => void }) {
  const { t, lang } = useLang();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = new Date(ym.y, ym.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const byDay: Record<string, Set<string>> = {};
  slots.forEach((s) => { if (s.status !== "cancelled") (byDay[s.date] ??= new Set()).add(s.status === "confirmed" ? "booked" : s.status); });
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const shift = (d: number) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });

  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shift(-1)} aria-label={t("tracks.prevMonth")} className="p-2"><ChevronLeft size={18} /></button>
        <p className="text-sm font-medium capitalize">{formatDate(first, lang, "monthYear")}</p>
        <button onClick={() => shift(1)} aria-label={t("tracks.nextMonth")} className="p-2"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground mb-1">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => <span key={d}>{dayName(d, lang)}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysIn }).map((_, i) => {
          const d = `${ym.y}-${pad(ym.m + 1)}-${pad(i + 1)}`;
          const kinds = byDay[d];
          const active = selected === d;
          return (
            <button key={d} onClick={() => onSelect(d)} disabled={d < today}
              className="h-11 rounded-lg flex flex-col items-center justify-center text-sm disabled:opacity-35"
              style={{ backgroundColor: active ? "var(--accent)" : undefined, color: active ? "var(--accent-foreground)" : undefined }}>
              {i + 1}
              <span className="flex gap-0.5 h-1.5 mt-0.5">
                {kinds && ["open", "split_open", "booked"].filter((k) => kinds.has(k)).map((k) => (
                  <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SLOT_COLORS[k] }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 justify-center mt-2 text-[10px] text-muted-foreground">
        {(["open", "split_open", "booked"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SLOT_COLORS[k] }} />{t(`slot.status.${k}`)}</span>
        ))}
      </div>
    </div>
  );
}
