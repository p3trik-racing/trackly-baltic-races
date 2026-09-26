import "leaflet/dist/leaflet.css";
import { useLang, catLabel, countryName, LangSwitcher } from "@/i18n";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
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

function icon(label: string, selected: boolean) {
  const size = selected ? 34 : 28;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="mr-pin${selected ? " mr-pin-active" : ""}" style="width:${size}px;height:${size}px">${label}</div>`,
  });
}

function FitBounds({ clusters }: { clusters: Cluster[] }) {
  const map = useMap();
  useEffect(() => {
    if (!clusters.length) return;
    const b = L.latLngBounds(clusters.map((c) => [c.lat, c.lng] as [number, number]));
    map.invalidateSize();
    map.fitBounds(b, { padding: [48, 48], maxZoom: 11 });
  }, [clusters, map]);
  return null;
}

export default function EventsMap({ events, selected, onSelect }: {
  events: UpcomingEvent[]; selected: string | null; onSelect: (key: string | null) => void;
}) {
  const { t } = useLang();
  const { theme } = useTheme();
  const clusters = useMemo(() => clusterEvents(events), [events]);
  return (
    <MapContainer center={[56.95, 24.11]} zoom={7} className="w-full h-full" zoomControl={false} attributionControl>
      <TileLayer
        key={theme}
        url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${theme === "dark" ? "Dark" : "Light"}_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        maxZoom={19}
        attribution='Tiles &copy; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, GIS user community'
      />
      <FitBounds clusters={clusters} />
      {clusters.map((c) => (
        <Marker
          key={c.key}
          position={[c.lat, c.lng]}
          icon={icon(c.events.length > 1 ? String(c.events.length) : catLabel(t, c.events[0].category).charAt(0), selected === c.key)}
          title={c.events.length > 1 ? t("map.events", { count: c.events.length }) : c.events[0].title}
          eventHandlers={{ click: () => onSelect(c.key) }}
        />
      ))}
    </MapContainer>
  );
}
