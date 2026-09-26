import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
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

const styleUrl = (theme: "dark" | "light") =>
  `https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "positron"}`;

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
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const currentStyleRef = useRef(styleUrl(theme));

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: currentStyleRef.current,
      center: [24.11, 56.95],
      zoom: 6.5,
      attributionControl: { compact: true },
      dragRotate: false,
      touchPitch: false,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    instance.on("style.load", () => setStyleRevision((n) => n + 1));
    setMap(instance);
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      instance.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const nextStyle = styleUrl(theme);
    if (currentStyleRef.current === nextStyle) return;
    currentStyleRef.current = nextStyle;
    // Style changes clear map layers. Refresh the markers once the new style is ready.
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    map.setStyle(nextStyle);
  }, [map, theme]);

  useEffect(() => {
    if (!map || !clusters.length) return;
    const bounds = new maplibregl.LngLatBounds();
    clusters.forEach(({ lng, lat }) => bounds.extend([lng, lat]));
    map.resize();
    map.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 0 });
  }, [map, clusters]);

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;
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

  return <div ref={containerRef} className="h-full w-full" />;
}