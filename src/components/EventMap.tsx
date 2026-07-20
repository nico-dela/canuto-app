"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CITY } from "@/lib/constants";
import type { CanutoEvent } from "@/lib/types";

export function EventMap({
  events,
  selectedId,
  userLocation,
  onSelect,
}: {
  events: CanutoEvent[];
  selectedId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [CITY.lng, CITY.lat],
      zoom: CITY.zoom,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const event of events) {
      if (event.lat == null || event.lng == null) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "canuto-marker";
      el.style.cssText = `
        width: 12px; height: 12px; border-radius: 999px; border: 2px solid #fff;
        background: ${event.id === selectedId ? "#ff5a3d" : "#1a2838"};
        cursor: pointer;
      `;
      el.addEventListener("click", () => onSelect?.(event.id));
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([event.lng, event.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (userLocation) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:12px;height:12px;border-radius:999px;background:#3b82f6;border:2px solid #fff";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [events, selectedId, userLocation, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const event = events.find((e) => e.id === selectedId);
    if (event?.lng != null && event.lat != null) {
      map.flyTo({ center: [event.lng, event.lat], zoom: 14, essential: true });
    }
  }, [selectedId, events]);

  return <div ref={containerRef} className="h-full min-h-[280px] w-full" />;
}
