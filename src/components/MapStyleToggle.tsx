import { useLang } from "@/i18n";
import type { MapKind } from "@/lib/map-style";

export function MapStyleToggle({ kind, onChange, position = "top-right" }: {
  kind: MapKind; onChange: (k: MapKind) => void; position?: "top-right" | "top-left";
}) {
  const { t } = useLang();
  return (
    <div role="group" aria-label={t("map.styleToggle")}
      className={`absolute z-10 flex rounded-lg overflow-hidden border border-border bg-card text-xs shadow ${position === "top-left" ? "top-16 left-2" : "top-2 right-2"}`}>
      {(["dark", "satellite"] as const).map((k) => (
        <button key={k} type="button" aria-pressed={kind === k} onClick={() => onChange(k)}
          className="h-8 whitespace-nowrap px-2.5"
          style={kind === k ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" } : undefined}>
          {t(k === "dark" ? "map.dark" : "map.satellite")}
        </button>
      ))}
    </div>
  );
}
