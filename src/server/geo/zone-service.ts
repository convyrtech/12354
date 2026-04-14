import type { GeoFindZoneRequest, ZoneMatch } from "@/lib/geo/types";
import { getGeoRuntimeConfig } from "@/server/geo/config";
import { GeoConfigError } from "@/server/geo/errors";
import { FileZoneProvider } from "@/server/geo/providers/file-zone-provider";
import { StaticZoneProvider } from "@/server/geo/providers/static-zone-provider";
import type { ZoneProvider } from "@/server/geo/provider-types";

type FindZoneDependencies = {
  provider?: ZoneProvider;
  signal?: AbortSignal;
};

function createZoneProvider() {
  const config = getGeoRuntimeConfig();

  if (config.zoneProvider === "file") {
    if (!config.zoneFile) {
      throw new GeoConfigError("Zone file provider is enabled, but GEO_ZONE_FILE is not configured.");
    }

    return new FileZoneProvider({
      zoneFile: config.zoneFile,
    });
  }

  return new StaticZoneProvider();
}

export async function findZone(
  input: GeoFindZoneRequest,
  dependencies: FindZoneDependencies = {},
): Promise<ZoneMatch> {
  const provider = dependencies.provider ?? createZoneProvider();
  return provider.findZone(input, {
    signal: dependencies.signal,
  });
}
