import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { GeoZoneGeometry, GeoFindZoneRequest, ZoneMatch } from "@/lib/geo/types";
import { GeoConfigError } from "@/server/geo/errors";
import type {
  GeoProviderRequestOptions,
  ZoneProvider,
} from "@/server/geo/provider-types";
import { isPointInZoneGeometry } from "@/server/geo/utils/geo";
import { isPastMoscowCutoff } from "@/server/geo/utils/moscow-clock";

type FileZoneRecord = {
  zoneId: string;
  label: string;
  priority: number;
  deliveryEnabled: boolean;
  kitchenId: string;
  servicePointId: string;
  legalEntityId: string;
  acceptingOrdersUntil: string;
  resolverNote: string;
  polygon: GeoZoneGeometry;
};

type CacheEntry = {
  mtimeMs: number;
  records: FileZoneRecord[];
};

const zoneFileCache = new Map<string, CacheEntry>();

function isLngLatTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function isValidZoneGeometry(value: unknown): value is GeoZoneGeometry {
  if (!value || typeof value !== "object" || !("type" in value) || !("coordinates" in value)) {
    return false;
  }

  const geometry = value as GeoZoneGeometry;

  if (geometry.type === "Polygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.every(
        (ring) => Array.isArray(ring) && ring.every((point) => isLngLatTuple(point)),
      )
    );
  }

  if (geometry.type === "MultiPolygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.every(
        (polygon) =>
          Array.isArray(polygon) &&
          polygon.every(
            (ring) => Array.isArray(ring) && ring.every((point) => isLngLatTuple(point)),
          ),
      )
    );
  }

  return false;
}

function validateFileZoneRecord(value: unknown, index: number): FileZoneRecord {
  if (!value || typeof value !== "object") {
    throw new GeoConfigError(`Zone record at index ${index} is invalid.`);
  }

  const record = value as Partial<FileZoneRecord>;

  if (
    typeof record.zoneId !== "string" ||
    typeof record.label !== "string" ||
    typeof record.priority !== "number" ||
    typeof record.deliveryEnabled !== "boolean" ||
    typeof record.kitchenId !== "string" ||
    typeof record.servicePointId !== "string" ||
    typeof record.legalEntityId !== "string" ||
    typeof record.acceptingOrdersUntil !== "string" ||
    typeof record.resolverNote !== "string" ||
    !isValidZoneGeometry(record.polygon)
  ) {
    throw new GeoConfigError(`Zone record at index ${index} is missing required fields.`);
  }

  return {
    zoneId: record.zoneId,
    label: record.label,
    priority: record.priority,
    deliveryEnabled: record.deliveryEnabled,
    kitchenId: record.kitchenId,
    servicePointId: record.servicePointId,
    legalEntityId: record.legalEntityId,
    acceptingOrdersUntil: record.acceptingOrdersUntil,
    resolverNote: record.resolverNote,
    polygon: record.polygon,
  };
}

function buildOutOfZoneMatch(): ZoneMatch {
  return {
    inZone: false,
    deliveryState: "out-of-zone",
    zoneId: null,
    zoneLabel: null,
    polygon: null,
    kitchenId: null,
    servicePointId: null,
    legalEntityId: null,
    resolverNote: "Точка не попала ни в одну активную зону доставки.",
  };
}

function readZoneFile(zoneFile: string): FileZoneRecord[] {
  const absolutePath = path.isAbsolute(zoneFile)
    ? zoneFile
    : path.resolve(process.cwd(), zoneFile);

  let stats: ReturnType<typeof statSync>;

  try {
    stats = statSync(absolutePath);
  } catch {
    throw new GeoConfigError(`Zone file "${absolutePath}" was not found.`);
  }

  const cached = zoneFileCache.get(absolutePath);

  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.records;
  }

  let raw: string;

  try {
    raw = readFileSync(absolutePath, "utf8");
  } catch {
    throw new GeoConfigError(`Zone file "${absolutePath}" could not be read.`);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GeoConfigError(`Zone file "${absolutePath}" contains invalid JSON.`);
  }

  if (!Array.isArray(parsed)) {
    throw new GeoConfigError(`Zone file "${absolutePath}" must contain an array of zones.`);
  }

  const records = parsed.map((entry, index) => validateFileZoneRecord(entry, index));
  zoneFileCache.set(absolutePath, {
    mtimeMs: stats.mtimeMs,
    records,
  });

  return records;
}

export class FileZoneProvider implements ZoneProvider {
  constructor(private readonly input: { zoneFile: string | null }) {}

  async findZone(
    input: GeoFindZoneRequest,
    _options?: GeoProviderRequestOptions,
  ): Promise<ZoneMatch> {
    if (!this.input.zoneFile) {
      throw new GeoConfigError("Zone file provider is enabled, but GEO_ZONE_FILE is not configured.");
    }

    const matches = readZoneFile(this.input.zoneFile)
      .filter((record) => record.deliveryEnabled)
      .filter((record) => isPointInZoneGeometry({ lat: input.lat, lng: input.lng }, record.polygon))
      .sort((left, right) => right.priority - left.priority || left.zoneId.localeCompare(right.zoneId));

    const winner = matches[0];

    if (!winner) {
      return buildOutOfZoneMatch();
    }

    return {
      inZone: true,
      deliveryState: isPastMoscowCutoff(winner.acceptingOrdersUntil) ? "cutoff" : "in-zone",
      zoneId: winner.zoneId,
      zoneLabel: winner.label,
      polygon: winner.polygon,
      kitchenId: winner.kitchenId,
      servicePointId: winner.servicePointId,
      legalEntityId: winner.legalEntityId,
      resolverNote: winner.resolverNote,
    };
  }
}
