import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";

const RIGA: [number, number] = [24.1052, 56.9496];
import { mapStyle, useMapKind } from "@/lib/map-style";
import { MapStyleToggle } from "@/components/MapStyleToggle";

/** Small map: tap to place the pin, drag it to fine-tune. */
export default function LocationPickerMap({ lat, lng, onChange }: {
  lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void;
}) {
  const { theme } = useTheme();
  const [kind, setKind] = useMapKind();
  const styleKeyRef = useRef(`${kind}:${theme}`);
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function placeMarker(map: maplibregl.Map, lngLat: [number, number]) {
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "mr-pin mr-pin-active";
      markerRef.current = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(lngLat).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLngLat();
        onChangeRef.current(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLngLat(lngLat);
    }
  }

  useEffect(() => {
    if (!ref.current) return;
    maplibregl.setWorkerUrl(workerUrl);
    const has = lat != null && lng != null;
    const map = new maplibregl.Map({
      container: ref.current,
      style: mapStyle(kind, theme),
      center: has ? [lng!, lat!] : RIGA,
      zoom: has ? 13 : 7,
      dragRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("click", (e) => {
      placeMarker(map, [e.lngLat.lng, e.lngLat.lat]);
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    });
    if (has) placeMarker(map, [lng!, lat!]);
    mapRef.current = map;
    return () => { markerRef.current = null; map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const next = `${kind}:${theme}`;
    if (!map || styleKeyRef.current === next) return;
    styleKeyRef.current = next;
    map.setStyle(mapStyle(kind, theme));
  }, [kind, theme]);

  // External changes (search result selected) move the pin and the view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    const cur = markerRef.current?.getLngLat();
    if (cur && Math.abs(cur.lat - lat) < 1e-7 && Math.abs(cur.lng - lng) < 1e-7) return;
    placeMarker(map, [lng, lat]);
    map.flyTo({ center: [lng, lat], zoom: 14 });
  }, [lat, lng]);

  return (
    <div className="relative w-full h-56 rounded-xl overflow-hidden border border-border">
      <div ref={ref} className="w-full h-full" />
      <MapStyleToggle kind={kind} onChange={setKind} />
    </div>
  );
}
