import { forwardRef, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n";

export function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const { t } = useLang();
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={t("rate.star", { n })}>
          <Star size={size} color="var(--accent)" fill={n <= value ? "var(--accent)" : "none"} />
        </button>
      ))}
    </div>
  );
}

/** "★ 4.6 (12)" — hidden when there are no ratings. */
export function RatingBadge({ avg, count, className }: { avg?: number | null; count?: number | null; className?: string }) {
  if (!count) return null;
  return <span className={className ?? "text-xs font-medium"}>★ {Number(avg ?? 0).toFixed(1)} ({count})</span>;
}

export const RateEventCard = forwardRef<HTMLDivElement, { eventId: string; userId: string; highlight?: boolean; onSaved?: () => void }>(
  function RateEventCard({ eventId, userId, highlight, onSaved }, ref) {
    const { t } = useLang();
    const [stars, setStars] = useState(0);
    const [comment, setComment] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      supabase.from("event_ratings").select("stars,comment").eq("event_id", eventId).eq("user_id", userId).maybeSingle()
        .then(({ data }) => { if (data) { setStars(data.stars); setComment(data.comment ?? ""); } });
    }, [eventId, userId]);
    async function save() {
      if (stars < 1) return toast.error(t("rate.pick"));
      setBusy(true);
      const { error } = await supabase.rpc("rate_event", { _event_id: eventId, _stars: stars, _comment: comment.trim() });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success(t("rate.saved"));
      onSaved?.();
    }
    return (
      <div ref={ref} className="bg-card border rounded-2xl p-4 space-y-3 transition-shadow"
        style={{ borderColor: highlight ? "var(--accent)" : "var(--border)", boxShadow: highlight ? "0 0 0 3px color-mix(in oklab, var(--accent) 35%, transparent)" : undefined }}>
        <h2 className="font-semibold">{t("rate.title")}</h2>
        <Stars value={stars} onChange={setStars} />
        <textarea className="input-field min-h-[70px]" value={comment} maxLength={1000}
          onChange={(e) => setComment(e.target.value)} placeholder={t("rate.comment")} />
        <button onClick={save} disabled={busy} className="cta-button disabled:opacity-50">{t("rate.save")}</button>
      </div>
    );
  });
