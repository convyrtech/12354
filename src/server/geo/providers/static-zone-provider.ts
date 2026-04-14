import type { GeoFindZoneRequest, ZoneMatch } from "@/lib/geo/types";
import { staticZoneRecords } from "@/server/geo/data/static-zone-data";
import type {
  GeoProviderRequestOptions,
  ZoneProvider,
} from "@/server/geo/provider-types";
import { isPastMoscowCutoff } from "@/server/geo/utils/moscow-clock";
import { isPointInZoneGeometry } from "@/server/geo/utils/geo";

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

export class StaticZoneProvider implements ZoneProvider {
  async findZone(
    input: GeoFindZoneRequest,
    _options?: GeoProviderRequestOptions,
  ): Promise<ZoneMatch> {
    const matches = staticZoneRecords
      .filter((record) => record.deliveryEnabled)
      .filter((record) =>
        isPointInZoneGeometry({ lat: input.lat, lng: input.lng }, record.polygon),
      )
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
