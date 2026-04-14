import type { GeoLngLat, GeoZoneGeometry } from "@/lib/geo/types";

function isPointOnSegment(
  pointLng: number,
  pointLat: number,
  start: GeoLngLat,
  end: GeoLngLat,
) {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const cross =
    (pointLat - startLat) * (endLng - startLng) -
    (pointLng - startLng) * (endLat - startLat);

  if (Math.abs(cross) > 1e-10) {
    return false;
  }

  const dot =
    (pointLng - startLng) * (endLng - startLng) +
    (pointLat - startLat) * (endLat - startLat);

  if (dot < 0) {
    return false;
  }

  const squaredLength =
    (endLng - startLng) * (endLng - startLng) +
    (endLat - startLat) * (endLat - startLat);

  return dot <= squaredLength;
}

function isPointInRing(pointLat: number, pointLng: number, ring: GeoLngLat[]) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];

    if (!currentPoint || !previousPoint) {
      continue;
    }

    if (isPointOnSegment(pointLng, pointLat, previousPoint, currentPoint)) {
      return true;
    }

    const [currentLng, currentLat] = currentPoint;
    const [previousLng, previousLat] = previousPoint;
    const intersects =
      currentLat > pointLat !== previousLat > pointLat &&
      pointLng <
        ((previousLng - currentLng) * (pointLat - currentLat)) /
          (previousLat - currentLat) +
          currentLng;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygonCoordinates(
  pointLat: number,
  pointLng: number,
  coordinates: GeoLngLat[][],
) {
  const [outerRing, ...holes] = coordinates;

  if (!outerRing || !isPointInRing(pointLat, pointLng, outerRing)) {
    return false;
  }

  return !holes.some((hole) => isPointInRing(pointLat, pointLng, hole));
}

export function isPointInZoneGeometry(
  point: { lat: number; lng: number },
  geometry: GeoZoneGeometry,
) {
  if (geometry.type === "Polygon") {
    return isPointInPolygonCoordinates(point.lat, point.lng, geometry.coordinates);
  }

  return geometry.coordinates.some((polygon) =>
    isPointInPolygonCoordinates(point.lat, point.lng, polygon),
  );
}

export function getHaversineDistanceMeters(input: {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(input.destinationLat - input.originLat);
  const lngDelta = toRadians(input.destinationLng - input.originLng);
  const originLatRadians = toRadians(input.originLat);
  const destinationLatRadians = toRadians(input.destinationLat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(originLatRadians) *
      Math.cos(destinationLatRadians) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusMeters * c);
}
