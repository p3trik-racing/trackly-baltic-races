import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n";

const COUNTRY_BY_CODE: Record<string, string> = { LV: "Latvia", EE: "Estonia", LT: "Lithuania" };
interface Place { name: string; street: string; city: string; country: string; countrycode: string; lat: number; lng: number }
export interface PickedPlace { label: string; city: string; country?: string; lat: number; lng: number }

/** Photon address search (Baltics bbox), debounced 400 ms, min 3 chars — same as the post-event form. */
export function PlaceSearch({ initial, onPick, onText }: { initial?: string; onPick: (p: PickedPlace) => void; onText?: (v: string) => void }) {
  const { t } = useLang();
  const [q, setQ] = useState(initial ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [show, setShow] = useState(false);
  const [searching, setSearching] = useState(false);
  const picked = useRef(initial ?? "");

  useEffect(() => {
    const s = q.trim();
    if (s.length < 3 || s === picked.current) { setResults([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(s)}&limit=5&lang=en&bbox=20.9,53.8,28.3,59.8`, { signal: ctrl.signal });
        const json = await res.json();
        setResults((json.features ?? []).map((f: any) => ({
          name: f.properties?.name ?? [f.properties?.street, f.properties?.housenumber].filter(Boolean).join(" "),
          street: [f.properties?.street, f.properties?.housenumber].filter(Boolean).join(" "),
          city: f.properties?.city ?? f.properties?.town ?? f.properties?.village ?? f.properties?.county ?? "",
          country: f.properties?.country ?? "",
          countrycode: (f.properties?.countrycode ?? "").toUpperCase(),
          lat: f.geometry?.coordinates?.[1], lng: f.geometry?.coordinates?.[0],
        })).filter((p: Place) => typeof p.lat === "number" && typeof p.lng === "number"));
      } catch { /* aborted */ }
      setSearching(false);
    }, 400);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q]);

  function pick(p: Place) {
    const label = p.name || p.street;
    picked.current = label;
    setQ(label); setShow(false); setResults([]);
    onPick({ label, city: p.city, country: COUNTRY_BY_CODE[p.countrycode], lat: p.lat, lng: p.lng });
  }

  return (
    <div className="relative">
      <input className="input-field" placeholder={t("organiser.post.mapPlaceholder")} value={q}
        onChange={(e) => { setQ(e.target.value); onText?.(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 200)} />
      {show && q.trim().length >= 3 && (results.length > 0 || !searching) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {results.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">{t("organiser.post.noResults")}</p> : results.map((p, i) => (
            <button key={i} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)} className="block w-full text-left px-3 py-2 border-b border-border last:border-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{[p.street, p.city, p.country].filter(Boolean).join(", ")}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
