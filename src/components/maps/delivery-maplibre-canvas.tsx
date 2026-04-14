"use client";

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

type DeliveryMaplibreCanvasProps = {
  focusKey: string;
  kitchenLat: number | null;
  kitchenLng: number | null;
  kitchenLabel?: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationLabel?: string | null;
  addressLine?: string | null;
  serviceLine?: string | null;
  zoneLabel?: string | null;
  etaLabel?: string | null;
  zoneGeometry?: GeoZoneGeometry | null;
  deliveryState?: GeoDeliveryState | null;
  alternativePins?: DeliveryMaplibreAlternativePin[];
  isRequoting?: boolean;
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

function createKitchenMarkerElement() {
  const element = document.createElement("div");
  element.style.width = "18px";
  element.style.height = "18px";
  element.style.borderRadius = "999px";
  element.style.border = "2px solid rgba(99, 188, 197, 0.95)";
  element.style.background = "rgba(8, 16, 20, 0.92)";
  element.style.boxShadow = "0 0 0 5px rgba(99, 188, 197, 0.12)";
  element.style.backdropFilter = "blur(10px)";
  element.title = MAP_COPY.activeKitchen;
  return element;
}

function createDestinationMarkerElement() {
  const element = document.createElement("div");
  element.style.width = "34px";
  element.style.height = "34px";
  element.style.borderRadius = "999px";
  element.style.border = "2px solid rgba(245, 242, 236, 0.94)";
  element.style.background =
    "radial-gradient(circle at 30% 30%, rgba(255,255,255,1) 0%, rgba(245,242,236,0.98) 38%, rgba(230,228,223,0.94) 100%)";
  element.style.boxShadow =
    "0 16px 32px rgba(0,0,0,0.28), 0 0 0 10px rgba(245, 242, 236, 0.08)";
  element.style.cursor = "grab";
  element.title = MAP_COPY.dropoffPoint;
  return element;
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
  addressLine,
  serviceLine,
  zoneLabel,
  etaLabel,
  zoneGeometry,
  deliveryState,
  alternativePins = [],
  isRequoting = false,
  onDestinationCommit,
}: DeliveryMaplibreCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapModuleRef = useRef<MapLibreModule | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const kitchenMarkerRef = useRef<MapLibreMarker | null>(null);
  const destinationMarkerRef = useRef<MapLibreMarker | null>(null);
  const previewDestinationRef = useRef<LatLngPoint | null>(null);
  const lastFocusKeyRef = useRef<string | null>(null);
  const syncMapDataRef = useRef<(shouldFitBounds: boolean) => void>(() => undefined);
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
    (shouldFitBounds: boolean) => {
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
          kitchenMarkerRef.current = new maplibregl.Marker({
            element: createKitchenMarkerElement(),
            anchor: "center",
          }).addTo(map);
        }

        kitchenMarkerRef.current.setLngLat([kitchenPoint.lng, kitchenPoint.lat]);
        kitchenMarkerRef.current.getElement().title = kitchenLabel ?? MAP_COPY.activeKitchen;
      } else {
        kitchenMarkerRef.current?.remove();
        kitchenMarkerRef.current = null;
      }

      if (activeDestination) {
        if (!destinationMarkerRef.current) {
          destinationMarkerRef.current = new maplibregl.Marker({
            element: createDestinationMarkerElement(),
            anchor: "center",
            draggable: Boolean(onDestinationCommit),
          }).addTo(map);

          destinationMarkerRef.current.on("dragstart", () => {
            setIsDraggingPin(true);
          });

          destinationMarkerRef.current.on("drag", () => {
            const lngLat = destinationMarkerRef.current?.getLngLat();

            if (!lngLat) {
              return;
            }

            previewDestinationRef.current = { lat: lngLat.lat, lng: lngLat.lng };
            syncMapDataRef.current(false);
          });

          destinationMarkerRef.current.on("dragend", () => {
            const lngLat = destinationMarkerRef.current?.getLngLat();
            setIsDraggingPin(false);

            if (!lngLat) {
              return;
            }

            previewDestinationRef.current = { lat: lngLat.lat, lng: lngLat.lng };
            syncMapDataRef.current(false);
            onDestinationCommitRef.current?.({
              lat: lngLat.lat,
              lng: lngLat.lng,
              sourceAddressLabel: destinationLabelRef.current ?? null,
            });
          });
        }

        destinationMarkerRef.current.setLngLat([activeDestination.lng, activeDestination.lat]);
        destinationMarkerRef.current.getElement().title = destinationLabel ?? MAP_COPY.dropoffPoint;
      } else {
        destinationMarkerRef.current?.remove();
        destinationMarkerRef.current = null;
      }

      if (!shouldFitBounds) {
        return;
      }

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
          duration: 900,
        });
        return;
      }

      map.fitBounds(bounds, {
        padding: { top: 80, right: 88, bottom: 88, left: 88 },
        duration: 900,
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
      onDestinationCommit,
      zoneGeometry,
    ],
  );

  useEffect(() => {
    syncMapDataRef.current = syncMapData;
    onDestinationCommitRef.current = onDestinationCommit;
    destinationLabelRef.current = destinationLabel;
  }, [destinationLabel, onDestinationCommit, syncMapData]);

  useEffect(() => {
    let cancelled = false;

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
          map.addLayer({
            id: "raki-zone-fill",
            type: "fill",
            source: "raki-zone",
            paint: {
              "fill-color": [
                "match",
                ["get", "state"],
                "cutoff",
                "#c7694a",
                "out-of-zone",
                "#b7594c",
                "#63bcc5",
              ],
              "fill-opacity": [
                "match",
                ["get", "state"],
                "cutoff",
                0.08,
                "out-of-zone",
                0.08,
                0.05,
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
                "#b7594c",
                "#63bcc5",
              ],
              "line-width": 2,
              "line-opacity": 0.82,
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

        syncMapData(true);
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
  }, [syncMapData]);

  useEffect(() => {
    if (lastFocusKeyRef.current !== focusKey) {
      previewDestinationRef.current = null;
      lastFocusKeyRef.current = focusKey;
      syncMapData(true);
      return;
    }

    if (
      previewDestinationRef.current &&
      destinationPoint &&
      !hasPointChanged(previewDestinationRef.current, destinationPoint)
    ) {
      previewDestinationRef.current = null;
    }

    syncMapData(false);
  }, [destinationPoint, focusKey, syncMapData]);

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
