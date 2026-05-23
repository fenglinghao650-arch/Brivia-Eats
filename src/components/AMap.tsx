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

/* ── Marker rendering ──
 * Two-axis design system:
 *   COLOR signals curation:  gold = onboarded/picked, grey = catalog
 *   SHAPE signals zoom:      disc at city zoom (less screen room), pin at street zoom
 * The threshold below is where AMap shifts from city to street detail.
 */

const ZOOM_PIN_THRESHOLD = 15;

type MarkerMode = "pin" | "disc";

function getMarkerMode(zoom: number): MarkerMode {
  return zoom >= ZOOM_PIN_THRESHOLD ? "pin" : "disc";
}

function getMarkerContent(source: MapMarker["source"], mode: MarkerMode): string {
  const isBrivia = source === "brivia";
  if (isBrivia && mode === "pin") {
    // Gold teardrop + cream 4-point editorial star
    return `<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.22));cursor:pointer;display:block;">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12.75 17 25 17 25s17-12.25 17-25C34 7.6 26.4 0 17 0z" fill="#d98f11"/>
      <path d="M17 8 L18.6 14.4 L25 16 L18.6 17.6 L17 24 L15.4 17.6 L9 16 L15.4 14.4 Z" fill="#fbf9f1"/>
    </svg>`;
  }
  if (isBrivia) {
    // Gold disc with hairline cream ring + center dot (stamp/seal feel)
    return `<svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1.5px 2px rgba(0,0,0,0.2));cursor:pointer;display:block;">
      <circle cx="16" cy="16" r="14" fill="#d98f11"/>
      <circle cx="16" cy="16" r="11" fill="none" stroke="#fbf9f1" stroke-width="1"/>
      <circle cx="16" cy="16" r="3" fill="#fbf9f1"/>
    </svg>`;
  }
  if (mode === "pin") {
    // Warm-grey mini teardrop + cream center dot
    return `<svg width="16" height="20" viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.18));cursor:pointer;display:block;">
      <path d="M9 0C4 0 0 4 0 9c0 6.5 9 13 9 13s9-6.5 9-13C18 4 14 0 9 0z" fill="#a3a3a3"/>
      <circle cx="9" cy="9" r="2.5" fill="#fbf9f1"/>
    </svg>`;
  }
  // Warm-grey filled dot with cream ring border — matches the mini-pin's grey
  return `<svg width="11" height="11" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;display:block;">
    <circle cx="6.5" cy="6.5" r="4.5" fill="#a3a3a3" stroke="#fbf9f1" stroke-width="1.5"/>
  </svg>`;
}

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

  // Current marker shape mode — tracked so we know when zoom crosses the threshold
  const currentModeRef = useRef<MarkerMode>("disc");

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

      const mode = getMarkerMode(mapRef.current.getZoom());
      currentModeRef.current = mode;

      const newMarkers = list
        .filter((m) => m.lat && m.lng)
        .map((m) => {
          const isBrivia = m.source === "brivia";
          const marker = new api.Marker({
            position: new api.LngLat(m.lng, m.lat),
            content: getMarkerContent(m.source, mode),
            anchor: mode === "pin" ? "bottom-center" : "center",
            zIndex: isBrivia ? 200 : 100,
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
          mapStyle: "amap://styles/2b9331a35ef2854b9a86b9a662257620",
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

        // Re-render markers when zoom crosses the disc/pin threshold
        const checkZoomMode = () => {
          if (!mapRef.current || !apiRef.current) return;
          const newMode = getMarkerMode(mapRef.current.getZoom());
          if (newMode !== currentModeRef.current) {
            syncMarkers(apiRef.current, markersRef.current);
          }
        };
        map.on("zoomend", checkZoomMode);

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
