"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/* ── Types ── */

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
};

type AMapProps = {
  center: [number, number]; // [lng, lat]
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: () => void;
  className?: string;
};

/* ── Free tile source (OpenFreeMap — no API key) ── */
const TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/* ── Component ── */

export default function AMap({
  center,
  zoom = 14,
  markers = [],
  onMarkerClick,
  onMapClick,
  className,
}: AMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);

  // Stable callbacks
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const clearMarkers = useCallback(() => {
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center,
      zoom,
      attributionControl: false,
    });

    // Compact attribution in bottom-right
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    // Navigation controls (zoom +/-)
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    // Map click → dismiss preview
    map.on("click", () => {
      onMapClickRef.current?.();
    });

    mapRef.current = map;

    return () => {
      clearMarkers();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  // Sync markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for map to be ready
    const addMarkers = () => {
      clearMarkers();

      markers
        .filter((m) => m.lat && m.lng)
        .forEach((m) => {
          // Custom marker element
          const el = document.createElement("div");
          el.className = "brivia-marker";
          el.style.width = "32px";
          el.style.height = "32px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor = "#18181b"; // zinc-900
          el.style.border = "3px solid white";
          el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          el.style.cursor = "pointer";

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([m.lng, m.lat])
            .addTo(map);

          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onMarkerClickRef.current?.(m.id);
          });

          markerRefs.current.push(marker);
        });
    };

    if (map.loaded()) {
      addMarkers();
    } else {
      map.on("load", addMarkers);
    }
  }, [markers, clearMarkers]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
