import type { StyleSpecification } from "maplibre-gl";
import { useEffect, useState } from "react";

export type MapKind = "dark" | "satellite";
const KEY = "majorka-map-style";

const SATELLITE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Tiles © Esri — Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "esri", type: "raster", source: "esri" }],
};

export function mapStyle(kind: MapKind, theme: "dark" | "light"): string | StyleSpecification {
  if (kind === "satellite") return SATELLITE;
  return `https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "positron"}`;
}

export function readMapKind(): MapKind {
  try { return localStorage.getItem(KEY) === "satellite" ? "satellite" : "dark"; } catch { return "dark"; }
}

export function useMapKind() {
  const [kind, setKind] = useState<MapKind>(readMapKind);
  useEffect(() => { try { localStorage.setItem(KEY, kind); } catch {} }, [kind]);
  return [kind, setKind] as const;
}
