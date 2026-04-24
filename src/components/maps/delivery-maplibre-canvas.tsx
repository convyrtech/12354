"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoDeliveryState, GeoZoneGeometry } from "@/lib/geo/types";

type MapLibreModule = typeof import("maplibre-gl");
type MapLibreMap = import("maplibre-gl").Map;
type MapLibreMarker = import("maplibre-gl").Marker;
type MapLibreLngLatBounds = import("maplibre-gl").LngLatBounds;
type MapLibreGeoJSONSource = import("maplibre-gl").GeoJSONSource;

type DeliveryMaplibreAlternativePin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type DeliveryMapPinCommit = {
  lat: number;
  lng: number;
  sourceAddressLabel: string | null;
};

/**
 * Viewport reaction when the destination/quote changes.
 *
 *   fit-bounds — recompute bounds (kitchen + destination + zone) with padding.
 *                Use for bootstrap and any source the user hasn't manually framed.
 *   fly-to     — animated centre on the destination, keep current zoom (or zoom in
 *                slightly if too far out). Use after suggest pick — user hasn't
 *                touched the map yet, but expects motion confirming the choice.
 *   preserve   — leave the camera alone. Use after map_pin commit — the user just
 *                framed exactly what they want; snapping to fitBounds would erase it.
 */
export type DeliveryMapViewportPolicy = "fit-bounds" | "preserve" | "fly-to";

type DeliveryMaplibreCanvasProps = {
  focusKey: string;
  kitchenLat: number | null;
  kitchenLng: number | null;
  kitchenLabel?: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationLabel?: string | null;
  zoneGeometry?: GeoZoneGeometry | null;
  deliveryState?: GeoDeliveryState | null;
  alternativePins?: DeliveryMaplibreAlternativePin[];
  isRequoting?: boolean;
  /** How the camera should react when destinationPoint/focusKey changes.
   *  Defaults to "fit-bounds" for back-compat. */
  viewportPolicy?: DeliveryMapViewportPolicy;
  onDestinationCommit?: (next: DeliveryMapPinCommit) => void;
};

type GeoJsonFeature = {
  type: "Feature";
  geometry:
    | GeoZoneGeometry
    | { type: "LineString"; coordinates: [number, number][] }
    | { type: "Point"; coordinates: [number, number] };
  properties?: Record<string, string | number | boolean | null>;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type LatLngPoint = {
  lat: number;
  lng: number;
};

const DEFAULT_CENTER: [number, number] = [37.618423, 55.751244];
const DEFAULT_MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "/map-styles/raki-investor-dark.json";
// Stable empty-array reference used as default for the optional prop. A fresh
// `[]` in the destructure would identity-change every render, invalidate
// `syncMapData`'s useCallback deps, and remount the map on every parent
// re-render (e.g. per keystroke in the address input).
const EMPTY_ALTERNATIVE_PINS: DeliveryMaplibreAlternativePin[] = [];

const MAP_COPY = {
  nextWindow: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0435 \u043e\u043a\u043d\u043e",
  outsideContour: "\u0412\u043d\u0435 \u043a\u043e\u043d\u0442\u0443\u0440\u0430",
  deliveryActive: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u0430",
  activeKitchen: "\u0410\u043a\u0442\u0438\u0432\u043d\u0430\u044f \u043a\u0443\u0445\u043d\u044f",
  dropoffPoint: "\u0422\u043e\u0447\u043a\u0430 \u0432\u0440\u0443\u0447\u0435\u043d\u0438\u044f",
  contourEyebrow:
    "\u0427\u0430\u0441\u0442\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0443\u0440 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f",
  contourFallback:
    "\u041a\u043e\u043d\u0442\u0443\u0440 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f",
  etaFallback:
    "\u041e\u043a\u043d\u043e \u043f\u043e\u043a\u0430\u0436\u0435\u043c \u043f\u043e\u0441\u043b\u0435 \u0440\u0430\u0441\u0447\u0451\u0442\u0430",
  movePinHint:
    "\u041f\u0438\u043d \u043c\u043e\u0436\u043d\u043e \u0442\u0438\u0445\u043e \u0441\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u043d\u0430 \u0441\u043e\u0441\u0435\u0434\u043d\u0438\u0439 \u0434\u043e\u043c \u0438\u043b\u0438 \u0432\u044a\u0435\u0437\u0434, \u0438 \u043e\u043a\u043d\u043e \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044f \u0441\u0440\u0430\u0437\u0443.",
  updatingPin:
    "\u0423\u0442\u043e\u0447\u043d\u044f\u0435\u043c \u043d\u043e\u0432\u0443\u044e \u0442\u043e\u0447\u043a\u0443",
  recalculatingWindow:
    "\u041f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u043c \u043e\u043a\u043d\u043e \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f",
  mapError:
    "\u041a\u0430\u0440\u0442\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430. \u0410\u0434\u0440\u0435\u0441 \u0438 \u0443\u0441\u043b\u043e\u0432\u0438\u044f \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0435\u043c \u0441\u0447\u0438\u0442\u0430\u0442\u044c.",
} as const;

function getStateChipLabel(deliveryState: GeoDeliveryState | null | undefined) {
  if (deliveryState === "cutoff") {
    return MAP_COPY.nextWindow;
  }

  if (deliveryState === "out-of-zone") {
    return MAP_COPY.outsideContour;
  }

  return MAP_COPY.deliveryActive;
}

function getStateChipTone(deliveryState: GeoDeliveryState | null | undefined) {
  if (deliveryState === "cutoff") {
    return {
      border: "rgba(199, 105, 74, 0.22)",
      background: "rgba(199, 105, 74, 0.12)",
      color: "#f1c7b3",
    };
  }

  if (deliveryState === "out-of-zone") {
    return {
      border: "rgba(183, 89, 76, 0.22)",
      background: "rgba(183, 89, 76, 0.12)",
      color: "#efb0a7",
    };
  }

  return {
    border: "rgba(99, 188, 197, 0.2)",
    background: "rgba(99, 188, 197, 0.12)",
    color: "#c7edf0",
  };
}

function createEmptyFeatureCollection(): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

// Kitchen marker: «РК» monogram on a brand-gold square. Square shape reads as
// "a place", not "a dropped pin", so users can tell kitchen apart from
// destination at a glance. Fraunces italic for brand identity.
function createKitchenMarkerElement() {
  const element = document.createElement("div");
  element.setAttribute("aria-label", "Кухня The Raki");
  element.style.width = "22px";
  element.style.height = "22px";
  element.style.borderRadius = "4px";
  element.style.border = "1.5px solid rgba(190, 150, 103, 0.7)";
  element.style.background = "rgba(8, 15, 18, 0.94)";
  element.style.boxShadow = "0 0 0 4px rgba(190, 150, 103, 0.10)";
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.fontFamily =
    'var(--font-poster), "Fraunces", "Cormorant Garamond", serif';
  element.style.fontStyle = "italic";
  element.style.fontSize = "9px";
  element.style.letterSpacing = "-0.02em";
  element.style.color = "#be9667";
  element.style.lineHeight = "1";
  element.style.textRendering = "optimizeLegibility";
  element.style.setProperty("-webkit-font-smoothing", "antialiased");
  element.textContent = "РК";
  element.title = MAP_COPY.activeKitchen;
  return element;
}

// Destination marker: golden SVG teardrop pin + animated pulse halo on commit.
// The pin shape anchors at the tip (bottom-center), so the map-space point
// visually aligns with the actual coordinates — not the marker centre.
function createDestinationMarkerElement() {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-label", "Точка доставки");
  wrapper.style.width = "36px";
  wrapper.style.height = "44px";
  wrapper.style.cursor = "grab";
  wrapper.style.position = "relative";
  wrapper.style.filter =
    "drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4))";
  wrapper.style.transition = "filter 220ms cubic-bezier(0.22, 1, 0.36, 1)";
  wrapper.classList.add("raki-destination-pin");
  wrapper.title = MAP_COPY.dropoffPoint;

  wrapper.innerHTML = `
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" aria-hidden="true" style="position:absolute;inset:0;">
      <path d="M18 2C9.163 2 2 9.163 2 18c0 11 16 24 16 24s16-13 16-24C34 9.163 26.837 2 18 2Z"
        fill="#be9667" stroke="#080f12" stroke-width="1.5"/>
      <circle cx="18" cy="18" r="5" fill="#080f12" opacity="0.7"/>
    </svg>
    <span class="raki-destination-pin__halo" aria-hidden="true"></span>
  `;
  return wrapper;
}

// Trigger a one-shot pulse halo after a commit (drag / suggest / geo).
function playDestinationPulse(element: HTMLElement) {
  element.classList.remove("raki-destination-pin--pulse");
  // Force reflow so the animation restarts on repeat commits.
  void element.offsetWidth;
  element.classList.add("raki-destination-pin--pulse");
}

function buildZoneFeatureCollection(
  zoneGeometry: GeoZoneGeometry | null | undefined,
  deliveryState: GeoDeliveryState | null | undefined,
): GeoJsonFeatureCollection {
  if (!zoneGeometry) {
    return createEmptyFeatureCollection();
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: zoneGeometry,
        properties: {
          state: deliveryState ?? "in-zone",
        },
      },
    ],
  };
}

function buildRouteFeatureCollection(
  kitchen: LatLngPoint | null,
  destination: LatLngPoint | null,
): GeoJsonFeatureCollection {
  if (!kitchen || !destination) {
    return createEmptyFeatureCollection();
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [kitchen.lng, kitchen.lat],
            [destination.lng, destination.lat],
          ],
        },
      },
    ],
  };
}

function buildAlternativePinsFeatureCollection(
  pins: DeliveryMaplibreAlternativePin[],
): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((pin) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [pin.lng, pin.lat],
      },
      properties: {
        id: pin.id,
        label: pin.label,
      },
    })),
  };
}

function extendBoundsWithGeometry(bounds: MapLibreLngLatBounds, geometry: GeoZoneGeometry) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => {
      ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    });
    return;
  }

  geometry.coordinates.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    });
  });
}

function hasPointChanged(left: LatLngPoint | null, right: LatLngPoint | null) {
  if (!left || !right) {
    return left !== right;
  }

  return Math.abs(left.lat - right.lat) > 0.0002 || Math.abs(left.lng - right.lng) > 0.0002;
}

function setSourceData(map: MapLibreMap, sourceId: string, data: GeoJsonFeatureCollection) {
  const source = map.getSource(sourceId) as MapLibreGeoJSONSource | undefined;
  source?.setData(data as never);
}

export function DeliveryMaplibreCanvas({
  focusKey,
  kitchenLat,
  kitchenLng,
  kitchenLabel,
  destinationLat,
  destinationLng,
  destinationLabel,
  zoneGeometry,
  deliveryState,
  alternativePins = EMPTY_ALTERNATIVE_PINS,
  isRequoting = false,
  viewportPolicy = "fit-bounds",
  onDestinationCommit,
}: DeliveryMaplibreCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // `matchMedia` was previously read per drag tick (60 Hz during drag).
  // Capture the MediaQueryList once at mount and read .matches off it live.
  const reducedMotionRef = useRef<MediaQueryList | null>(null);
  const mapModuleRef = useRef<MapLibreModule | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const kitchenMarkerRef = useRef<MapLibreMarker | null>(null);
  const destinationMarkerRef = useRef<MapLibreMarker | null>(null);
  const previewDestinationRef = useRef<LatLngPoint | null>(null);
  const lastFocusKeyRef = useRef<string | null>(null);
  const syncMapDataRef = useRef<(policy: DeliveryMapViewportPolicy) => void>(
    () => undefined,
  );
  const onDestinationCommitRef = useRef<typeof onDestinationCommit>(onDestinationCommit);
  const destinationLabelRef = useRef<string | null | undefined>(destinationLabel);
  const [isDraggingPin, setIsDraggingPin] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const kitchenPoint = useMemo<LatLngPoint | null>(() => {
    if (kitchenLat === null || kitchenLng === null) {
      return null;
    }

    return { lat: kitchenLat, lng: kitchenLng };
  }, [kitchenLat, kitchenLng]);

  const destinationPoint = useMemo<LatLngPoint | null>(() => {
    if (destinationLat === null || destinationLng === null) {
      return null;
    }

    return { lat: destinationLat, lng: destinationLng };
  }, [destinationLat, destinationLng]);

  const syncMapData = useCallback(
    (policy: DeliveryMapViewportPolicy) => {
      const map = mapRef.current;
      const maplibregl = mapModuleRef.current;

      if (!map || !maplibregl || !map.isStyleLoaded()) {
        return;
      }

      const activeDestination = previewDestinationRef.current ?? destinationPoint;

      setSourceData(map, "raki-zone", buildZoneFeatureCollection(zoneGeometry, deliveryState));
      setSourceData(map, "raki-route", buildRouteFeatureCollection(kitchenPoint, activeDestination));
      setSourceData(
        map,
        "raki-alternatives",
        buildAlternativePinsFeatureCollection(alternativePins),
      );

      if (kitchenPoint) {
        if (!kitchenMarkerRef.current) {
          // MapLibre v5 requires setLngLat() BEFORE addTo() — otherwise the
          // internal bind reads `this._lngLat.lng` on an undefined value and
          // the whole canvas crashes into MapErrorBoundary.
          kitchenMarkerRef.current = new maplibregl.Marker({
            element: createKitchenMarkerElement(),
            anchor: "center",
          })
            .setLngLat([kitchenPoint.lng, kitchenPoint.lat])
            .addTo(map);
        } else {
          kitchenMarkerRef.current.setLngLat([kitchenPoint.lng, kitchenPoint.lat]);
        }
        kitchenMarkerRef.current.getElement().title = kitchenLabel ?? MAP_COPY.activeKitchen;
      } else {
        kitchenMarkerRef.current?.remove();
        kitchenMarkerRef.current = null;
      }

      if (activeDestination) {
        if (!destinationMarkerRef.current) {
          // Same MapLibre v5 constraint: setLngLat before addTo.
          destinationMarkerRef.current = new maplibregl.Marker({
            element: createDestinationMarkerElement(),
            anchor: "center",
            // Check ref so keeping the callback stable across re-renders
            // doesn't force marker re-creation (parent closure identity
            // changes with every keystroke when query is in its deps).
            draggable: Boolean(onDestinationCommitRef.current),
          })
            .setLngLat([activeDestination.lng, activeDestination.lat])
            .addTo(map);

          destinationMarkerRef.current.on("dragstart", () => {
            setIsDraggingPin(true);
          });

          destinationMarkerRef.current.on("drag", () => {
            const lngLat = destinationMarkerRef.current?.getLngLat();

            if (!lngLat) {
              return;
            }

            previewDestinationRef.current = { lat: lngLat.lat, lng: lngLat.lng };
            // Live route line update during drag — never reframe the camera mid-gesture.
            syncMapDataRef.current("preserve");
          });

          destinationMarkerRef.current.on("dragend", () => {
            const lngLat = destinationMarkerRef.current?.getLngLat();
            setIsDraggingPin(false);

            if (!lngLat) {
              return;
            }

            previewDestinationRef.current = { lat: lngLat.lat, lng: lngLat.lng };
            // After drop, leave the user's framing as-is. Parent re-runs the quote
            // (with viewportPolicy="preserve" in effect) and the new zone draws
            // without snapping the viewport away from the dropped pin.
            syncMapDataRef.current("preserve");
            const element = destinationMarkerRef.current?.getElement();
            if (element) playDestinationPulse(element);
            onDestinationCommitRef.current?.({
              lat: lngLat.lat,
              lng: lngLat.lng,
              sourceAddressLabel: destinationLabelRef.current ?? null,
            });
          });
        } else {
          destinationMarkerRef.current.setLngLat([activeDestination.lng, activeDestination.lat]);
        }
        destinationMarkerRef.current.getElement().title = destinationLabel ?? MAP_COPY.dropoffPoint;
      } else {
        destinationMarkerRef.current?.remove();
        destinationMarkerRef.current = null;
      }

      if (policy === "preserve") {
        return;
      }

      // prefers-reduced-motion → drop animation duration to 0 (still essential).
      const reducedMotion = reducedMotionRef.current?.matches ?? false;
      const flyDuration = reducedMotion ? 0 : 700;
      const fitDuration = reducedMotion ? 0 : 900;

      if (policy === "fly-to" && activeDestination) {
        map.flyTo({
          center: [activeDestination.lng, activeDestination.lat],
          zoom: Math.max(map.getZoom(), 13.4),
          duration: flyDuration,
          essential: true,
        });
        return;
      }

      // fit-bounds (default): frame everything we have.
      const bounds = new maplibregl.LngLatBounds();
      let hasBounds = false;

      if (zoneGeometry) {
        extendBoundsWithGeometry(bounds, zoneGeometry);
        hasBounds = true;
      }

      [kitchenPoint, activeDestination, ...alternativePins].forEach((point) => {
        if (!point) {
          return;
        }

        bounds.extend([point.lng, point.lat]);
        hasBounds = true;
      });

      if (!hasBounds) {
        map.easeTo({
          center: DEFAULT_CENTER,
          zoom: 10.2,
          duration: fitDuration,
        });
        return;
      }

      map.fitBounds(bounds, {
        padding: { top: 80, right: 88, bottom: 88, left: 88 },
        duration: fitDuration,
        maxZoom: activeDestination && !zoneGeometry ? 13.6 : 12.8,
      });
    },
    [
      alternativePins,
      deliveryState,
      destinationLabel,
      destinationPoint,
      kitchenLabel,
      kitchenPoint,
      zoneGeometry,
      // `onDestinationCommit` intentionally omitted — it's consumed via
      // `onDestinationCommitRef.current` inside so the callback can change
      // identity (parent re-creates it every render because its own deps
      // include `query`) without invalidating this useCallback, which would
      // cascade into map re-mounts.
    ],
  );

  useEffect(() => {
    syncMapDataRef.current = syncMapData;
    onDestinationCommitRef.current = onDestinationCommit;
    destinationLabelRef.current = destinationLabel;
  }, [destinationLabel, onDestinationCommit, syncMapData]);

  useEffect(() => {
    let cancelled = false;

    if (
      reducedMotionRef.current === null &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      reducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
    }

    async function bootstrapMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const maplibregl = await import("maplibre-gl");

      if (cancelled || !containerRef.current) {
        return;
      }

      mapModuleRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: DEFAULT_MAP_STYLE_URL,
        center: DEFAULT_CENTER,
        zoom: 10.2,
        // Widen the camera box to cover Moscow + near-Moscow delivery
        // territory. Too narrow → users lose context when zooming out;
        // too wide → accidental drags to Africa. [west, south, east, north].
        maxBounds: [35.5, 54.9, 39.5, 57.0],
        attributionControl: false,
        dragRotate: false,
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("error", () => {
        setMapError(MAP_COPY.mapError);
      });

      map.on("load", () => {
        setMapError(null);

        if (!map.getSource("raki-zone")) {
          map.addSource("raki-zone", {
            type: "geojson",
            data: createEmptyFeatureCollection() as never,
          });
          // Zone fill + outline colour per delivery state:
          //   in-zone    → brand gold (--signal), quiet (trustworthy, not a badge)
          //   cutoff     → terracotta   (heads-up: next window)
          //   out-of-zone → muted red   (stop sign without shouting)
          map.addLayer({
            id: "raki-zone-fill",
            type: "fill",
            source: "raki-zone",
            paint: {
              "fill-color": [
                "match",
                ["get", "state"],
                "cutoff",
                "#c97a4e",
                "out-of-zone",
                "#b44a4a",
                "#be9667",
              ],
              "fill-opacity": [
                "match",
                ["get", "state"],
                "cutoff",
                0.08,
                "out-of-zone",
                0.07,
                0.06,
              ],
            },
          });
          map.addLayer({
            id: "raki-zone-outline",
            type: "line",
            source: "raki-zone",
            paint: {
              "line-color": [
                "match",
                ["get", "state"],
                "cutoff",
                "#d28763",
                "out-of-zone",
                "#c05050",
                "#be9667",
              ],
              "line-width": [
                "match",
                ["get", "state"],
                "cutoff",
                2,
                "out-of-zone",
                2,
                1.8,
              ],
              "line-opacity": [
                "match",
                ["get", "state"],
                "cutoff",
                0.7,
                "out-of-zone",
                0.65,
                0.55,
              ],
            },
          });
        }

        if (!map.getSource("raki-route")) {
          map.addSource("raki-route", {
            type: "geojson",
            data: createEmptyFeatureCollection() as never,
          });
          map.addLayer({
            id: "raki-route-glow",
            type: "line",
            source: "raki-route",
            paint: {
              "line-color": "rgba(245, 242, 236, 0.12)",
              "line-width": 8,
              "line-blur": 8,
            },
          });
          map.addLayer({
            id: "raki-route-line",
            type: "line",
            source: "raki-route",
            paint: {
              "line-color": "#f5f2ec",
              "line-width": 2.2,
              "line-dasharray": [1.2, 1.4],
              "line-opacity": 0.9,
            },
          });
        }

        if (!map.getSource("raki-alternatives")) {
          map.addSource("raki-alternatives", {
            type: "geojson",
            data: createEmptyFeatureCollection() as never,
          });
          map.addLayer({
            id: "raki-alternatives-halo",
            type: "circle",
            source: "raki-alternatives",
            paint: {
              "circle-radius": 6,
              "circle-color": "rgba(245, 242, 236, 0.08)",
            },
          });
          map.addLayer({
            id: "raki-alternatives-core",
            type: "circle",
            source: "raki-alternatives",
            paint: {
              "circle-radius": 3,
              "circle-color": "rgba(245, 242, 236, 0.68)",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "rgba(99, 188, 197, 0.5)",
            },
          });
        }

        // Read through the ref so the bootstrap effect itself can stay on []
        // deps — otherwise `syncMapData`'s identity (which depends on
        // destinationPoint, destinationLabel, onDestinationCommit) would
        // change on every parent re-render and tear down + recreate the
        // entire MapLibre instance on every keystroke.
        syncMapDataRef.current("fit-bounds");
      });
    }

    void bootstrapMap();

    return () => {
      cancelled = true;
      kitchenMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      mapRef.current?.remove();
      kitchenMarkerRef.current = null;
      destinationMarkerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastFocusKeyRef.current !== focusKey) {
      // New quote source — drop any drag preview, react per parent's policy.
      const isInitialMount = lastFocusKeyRef.current === null;
      previewDestinationRef.current = null;
      lastFocusKeyRef.current = focusKey;
      syncMapDataRef.current(viewportPolicy);
      // Pulse the destination on any new commit that isn't the initial mount
      // (a bootstrap restore from draft shouldn't feel like a celebration).
      if (!isInitialMount) {
        const element = destinationMarkerRef.current?.getElement();
        if (element) playDestinationPulse(element);
      }
      return;
    }

    if (
      previewDestinationRef.current &&
      destinationPoint &&
      !hasPointChanged(previewDestinationRef.current, destinationPoint)
    ) {
      previewDestinationRef.current = null;
    }

    // Same focusKey, just a data refresh (re-render with same destination):
    // never reframe — preserve the current camera.
    syncMapDataRef.current("preserve");
  }, [destinationPoint, focusKey, viewportPolicy]);

  const stateTone = getStateChipTone(deliveryState);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 14%, rgba(99, 188, 197, 0.11) 0%, transparent 28%), radial-gradient(circle at 86% 12%, rgba(182, 154, 109, 0.08) 0%, transparent 24%), linear-gradient(180deg, rgba(5, 12, 16, 0.24) 0%, rgba(6, 14, 18, 0.08) 22%, rgba(6, 12, 16, 0.5) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 18,
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -60px 120px rgba(4, 8, 10, 0.24)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {isDraggingPin || isRequoting ? (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 88,
            zIndex: 2,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(11, 20, 24, 0.9) 0%, rgba(8, 16, 20, 0.8) 100%)",
            backdropFilter: "blur(18px)",
            color: "var(--text-primary)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            pointerEvents: "none",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.24)",
          }}
        >
          {isDraggingPin ? MAP_COPY.updatingPin : MAP_COPY.recalculatingWindow}
        </div>
      ) : null}

      {mapError ? (
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            zIndex: 2,
            maxWidth: 360,
            padding: "12px 14px",
            borderRadius: 18,
            border: "1px solid rgba(183, 89, 76, 0.22)",
            background: "rgba(8, 16, 20, 0.84)",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.24)",
            backdropFilter: "blur(18px)",
            color: "var(--text-muted)",
            fontSize: 13,
            lineHeight: 1.5,
            pointerEvents: "none",
          }}
        >
          {mapError}
        </div>
      ) : null}
    </div>
  );
}
