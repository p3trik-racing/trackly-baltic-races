import { useLang } from "@/i18n";
import type { MapKind } from "@/lib/map-style";

export function MapStyleToggle({ kind, onChange }: { kind: MapKind; onChange: (k: MapKind) => void }) {
  const { t } = useLang();
  return (
    <div role="group" aria-label={t("map.styleToggle")}
      className="absolute top-2 right-2 z-10 flex rounded-lg overflow-hidden border border-border bg-card text-xs shadow">
      {(["dark", "satellite"] as const).map((k) => (
        <button key={k} type="button" aria-pressed={kind === k} onClick={() => onChange(k)}
          className="px-2.5 h-8"
          style={kind === k ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" } : undefined}>
          {t(k === "dark" ? "map.dark" : "map.satellite")}
        </button>
      ))}
    </div>
  );
}
