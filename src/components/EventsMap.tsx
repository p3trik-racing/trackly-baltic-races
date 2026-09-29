import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang, catLabel } from "@/i18n";
import type { UpcomingEvent } from "@/lib/upcoming-events";
import { useTheme } from "@/lib/theme-context";

export interface Cluster { key: string; lat: number; lng: number; events: UpcomingEvent[] }

export function clusterEvents(events: UpcomingEvent[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const e of events) {
    if (e.location_lat == null || e.location_lng == null) continue;
    const key = `${Number(e.location_lat).toFixed(5)},${Number(e.location_lng).toFixed(5)}`;
    const c = map.get(key) ?? { key, lat: Number(e.location_lat), lng: Number(e.location_lng), events: [] };
    c.events.push(e);
    map.set(key, c);
  }
  return [...map.values()];
}

import { mapStyle, useMapKind } from "@/lib/map-style";
import { MapStyleToggle } from "@/components/MapStyleToggle";

export default function EventsMap({ events, selected, onSelect }: {
  events: UpcomingEvent[]; selected: string | null; onSelect: (key: string | null) => void;
}) {
  const { t } = useLang();
  const { theme } = useTheme();
  const clusters = useMemo(() => clusterEvents(events), [events]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [styleRevision, setStyleRevision] = useState(0);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [kind, setKind] = useMapKind();
  const currentStyleRef = useRef(`${kind}:${theme}`);

  useEffect(() => {
    if (!containerRef.current) return;
    maplibregl.setWorkerUrl(workerUrl);
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(kind, theme),
      center: [24.1052, 56.9496],
      zoom: 7,
      attributionControl: { compact: true },
      dragRotate: false,
      touchPitch: false,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    instance.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "bottom-right");
    instance.on("style.load", () => setStyleRevision((n) => n + 1));
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const el = document.createElement("span");
        el.className = "mr-user-location";
        userMarkerRef.current?.remove();
        userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([coords.longitude, coords.latitude])
          .addTo(instance);
        instance.flyTo({ center: [coords.longitude, coords.latitude], zoom: 8 });
      },
      () => {},
      { timeout: 5000 },
    );
    setMap(instance);
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      instance.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const next = `${kind}:${theme}`;
    if (currentStyleRef.current === next) return;
    currentStyleRef.current = next;
    // Style changes clear map layers. Refresh the markers once the new style is ready.
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    map.setStyle(mapStyle(kind, theme));
  }, [map, theme, kind]);

  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = clusters.map((cluster) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `mr-pin${selected === cluster.key ? " mr-pin-active" : ""}`;
      el.textContent = cluster.events.length > 1
        ? String(cluster.events.length)
        : catLabel(t, cluster.events[0].category).charAt(0);
      el.title = cluster.events.length > 1
        ? t("map.events", { count: cluster.events.length })
        : cluster.events[0].title;
      el.setAttribute("aria-label", el.title);
      el.addEventListener("click", () => onSelectRef.current(cluster.key));
      return new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([cluster.lng, cluster.lat])
        .addTo(map);
    });
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [map, clusters, selected, t, styleRevision]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <MapStyleToggle kind={kind} onChange={setKind} />
    </div>
  );
}