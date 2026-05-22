"use client";

import { useEffect, useRef, useCallback } from "react";

/* ── Types ── */

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  source?: "brivia" | "amap";
  hasMenu?: boolean;
};

export type MapBounds = {
  swLng: number;
  swLat: number;
  neLng: number;
  neLat: number;
};

type AMapProps = {
  center: [number, number]; // [lng, lat] — GCJ-02
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: () => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  className?: string;
};

/* ── Global type for AMap security config (required by JSAPI 2.0) ── */

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRef = any;

/* ── Component ── */

export default function AMap({
  center,
  zoom = 14,
  markers = [],
  onMarkerClick,
  onMapClick,
  onBoundsChange,
  className,
}: AMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyRef>(null);
  const apiRef = useRef<AnyRef>(null);
  const markerRefs = useRef<AnyRef[]>([]);

  // Stable callback refs
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  // Always-current markers snapshot for use in async callbacks
  const markersRef = useRef(markers);
  markersRef.current = markers;

  const clearMarkers = useCallback(() => {
    if (mapRef.current && markerRefs.current.length) {
      mapRef.current.remove(markerRefs.current);
    }
    markerRefs.current = [];
  }, []);

  const syncMarkers = useCallback(
    (api: AnyRef, list: MapMarker[]) => {
      if (!mapRef.current || !api) return;
      clearMarkers();

      const newMarkers = list
        .filter((m) => m.lat && m.lng)
        .map((m) => {
          const color = m.source === "brivia" ? "#d98f11" : "#18181b";
          const size = m.source === "brivia" ? 34 : 28;
          const marker = new api.Marker({
            position: new api.LngLat(m.lng, m.lat),
            content: `<div style="
              width:${size}px;height:${size}px;border-radius:50%;
              background:${color};border:3px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;
            "></div>`,
            anchor: "center",
            title: m.label ?? "",
          });
          marker.on("click", () => onMarkerClickRef.current?.(m.id));
          return marker;
        });

      mapRef.current.add(newMarkers);
      markerRefs.current = newMarkers;
    },
    [clearMarkers]
  );

  // Initialize map — reruns only when center changes city
  useEffect(() => {
    if (!containerRef.current) return;

    const jsKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
    const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;
    if (!jsKey || !securityCode) {
      console.error("[AMap] NEXT_PUBLIC_AMAP_JS_KEY or NEXT_PUBLIC_AMAP_SECURITY_CODE is not set");
      return;
    }

    // Security config must be set before the loader runs
    window._AMapSecurityConfig = { securityJsCode: securityCode };

    let destroyed = false;

    import("@amap/amap-jsapi-loader")
      .then(({ default: AMapLoader }) =>
        AMapLoader.load({
          key: jsKey,
          version: "2.0",
          plugins: [],
        })
      )
      .then((api: AnyRef) => {
        if (destroyed || !containerRef.current) return;

        const map = new api.Map(containerRef.current, {
          zoom,
          center,
          mapStyle: "amap://styles/macaron",
        });

        map.on("click", () => onMapClickRef.current?.());

        // Emit debounced bounds on pan/zoom
        let boundsTimer: ReturnType<typeof setTimeout> | null = null;
        const emitBounds = () => {
          if (boundsTimer) clearTimeout(boundsTimer);
          boundsTimer = setTimeout(() => {
            const b = map.getBounds();
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            onBoundsChangeRef.current?.({
              swLng: sw.lng, swLat: sw.lat,
              neLng: ne.lng, neLat: ne.lat,
            });
          }, 600);
        };
        map.on("moveend", emitBounds);
        map.on("zoomend", emitBounds);

        // Add markers once tiles are ready
        map.on("complete", () => syncMarkers(api, markersRef.current));

        mapRef.current = map;
        apiRef.current = api;
      })
      .catch((err) => console.error("[AMap] init failed", err));

    return () => {
      destroyed = true;
      clearMarkers();
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        apiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  // Sync markers when data changes after map is already loaded
  useEffect(() => {
    if (mapRef.current && apiRef.current) {
      syncMarkers(apiRef.current, markers);
    }
  }, [markers, syncMarkers]);

  return (
    <div className={`relative ${className ?? ""}`} style={{ width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {(!process.env.NEXT_PUBLIC_AMAP_JS_KEY ||
        !process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fbf9f1] px-8 text-center">
          <div>
            <p className="text-sm font-semibold text-[#1e1e1e]">AMap is not configured</p>
            <p className="mt-1 text-xs text-zinc-500">
              Add the AMap JS key and security code to enable the interactive map.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
