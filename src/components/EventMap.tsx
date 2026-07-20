"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CITY } from "@/lib/constants";
import type { CanutoEvent } from "@/lib/types";

function prefersReducedMotion() {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.a11yMotion === "reduce";
}

function bigTargets() {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.a11yTargets === "big";
}

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
      fadeDuration: prefersReducedMotion() ? 0 : 300,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const size = bigTargets() ? 22 : 14;

    for (const event of events) {
      if (event.lat == null || event.lng == null) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "canuto-marker";
      el.setAttribute(
        "aria-label",
        selectedId === event.id
          ? `${event.title}, seleccionado`
          : `Plan: ${event.title}`,
      );
      el.setAttribute("aria-pressed", selectedId === event.id ? "true" : "false");
      el.style.cssText = `
        width: ${size}px; height: ${size}px; border-radius: 999px; border: 2px solid #fff;
        background: ${event.id === selectedId ? "var(--accent)" : "var(--ink)"};
        cursor: pointer; padding: 0; pointer-events: auto;
        box-shadow: 0 1px 4px rgba(26, 40, 56, 0.35);
      `;
      const select = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(event.id);
      };
      el.addEventListener("click", select);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(event.id);
        }
      });
      const marker = new maplibregl.Marker({ element: el, clickTolerance: 8 })
        .setLngLat([event.lng, event.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (userLocation) {
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
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
    if (event?.lng == null || event.lat == null) return;
    const center: [number, number] = [event.lng, event.lat];
    if (prefersReducedMotion()) {
      map.jumpTo({ center, zoom: 14 });
    } else {
      map.flyTo({ center, zoom: 14, essential: true });
    }
  }, [selectedId, events]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[280px] w-full"
      role="application"
      aria-label="Mapa de planes en Córdoba"
    />
  );
}
