"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";

type PickupMaplibreCanvasProps = {
  lat: number | null;
  lng: number | null;
  label?: string | null;
  address?: string | null;
};

type MapLibreMap = import("maplibre-gl").Map;
type MapLibreMarker = import("maplibre-gl").Marker;

const DEFAULT_MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "/map-styles/raki-investor-dark.json";

function createPickupMarkerElement(label: string) {
  const marker = document.createElement("div");
  marker.className = "raki-pickup-pin";
  marker.setAttribute("aria-label", label);
  marker.title = label;

  const dot = document.createElement("span");
  dot.className = "raki-pickup-pin__dot";
  dot.setAttribute("aria-hidden", "true");

  const halo = document.createElement("span");
  halo.className = "raki-pickup-pin__halo";
  halo.setAttribute("aria-hidden", "true");

  marker.append(halo, dot);
  return marker;
}

export function PickupMaplibreCanvas({
  lat,
  lng,
  label = "Точка самовывоза The Raki",
  address,
}: PickupMaplibreCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (lat === null || lng === null || !containerRef.current) {
      return;
    }

    let cancelled = false;
    setFailed(false);

    void import("maplibre-gl")
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;

        const map = new maplibre.Map({
          container: containerRef.current,
          style: DEFAULT_MAP_STYLE_URL,
          center: [lng, lat],
          zoom: 11.5,
          minZoom: 8,
          maxZoom: 17,
          attributionControl: {
            compact: true,
          },
        });

        map.addControl(
          new maplibre.NavigationControl({
            showCompass: false,
          }),
          "top-right",
        );

        const marker = new maplibre.Marker({
          element: createPickupMarkerElement(label ?? "Точка самовывоза The Raki"),
          anchor: "center",
        })
          .setLngLat([lng, lat])
          .addTo(map);

        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [address, label, lat, lng]);

  if (lat === null || lng === null || failed) {
    return (
      <div className="pickup-maplibre-canvas pickup-maplibre-canvas--fallback" role="status">
        <span>Карта временно недоступна.</span>
        {address ? <strong>{address}</strong> : null}
      </div>
    );
  }

  return (
    <div className="pickup-maplibre-canvas" aria-label={label ?? "Карта самовывоза"}>
      <div ref={containerRef} className="pickup-maplibre-canvas__viewport" />
    </div>
  );
}
