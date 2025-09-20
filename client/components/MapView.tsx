import { useEffect, useRef } from "react";

export interface Marker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  color?: string;
}

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  height?: number | string;
  interactive?: boolean;
}

export default function MapView({
  center,
  zoom = 13,
  markers = [],
  height = 300,
  interactive = true,
}: MapViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      const map = L.map(el, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
      });
      mapRef.current = map;
      const tiles = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      );
      tiles.addTo(map);
    }
    const map = mapRef.current;
    const c = center ?? { lat: 28.6139, lng: 77.209 };
    map.setView([c.lat, c.lng], zoom);

    const layerGroup = (window as any).L.layerGroup();
    layerGroup.addTo(map);

    markers.forEach((m) => {
      const marker = (window as any).L.marker([m.lat, m.lng], {
        title: m.title,
        alt: m.title,
        icon: coloredPin(m.color || "#0ea5e9"),
      });
      marker.addTo(layerGroup);
      if (m.title) {
        marker.bindPopup(`<strong>${escapeHtml(m.title)}</strong>`);
      }
    });

    return () => {
      map.eachLayer((layer: any) => {
        if (layer instanceof (window as any).L.Marker) {
          map.removeLayer(layer);
        }
      });
    };
  }, [center?.lat, center?.lng, zoom, interactive, JSON.stringify(markers)]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className="w-full rounded-lg overflow-hidden border"
    />
  );
}

function coloredPin(color: string) {
  const L = (window as any).L;
  const svg = encodeURIComponent(
    `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
      <path fill="${color}" d="M16 0C7.2 0 0 7.2 0 16c0 11 16 32 16 32s16-21 16-32C32 7.2 24.8 0 16 0z"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`,
  );
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -40],
  });
}

function escapeHtml(str?: string) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
