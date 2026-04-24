import { describe, expect, it } from "vitest";
import { staticZoneRecords } from "@/server/geo/data/static-zone-data";
import { findZone } from "@/server/geo/zone-service";
import { isPointInZoneGeometry } from "@/server/geo/utils/geo";

const TVERSKAYA_7 = { lat: 55.7579795, lng: 37.611263 };

describe("static zone matching", () => {
  it("does not treat a duplicated closing coordinate as a match for every point", () => {
    const rublevka = staticZoneRecords.find((record) => record.zoneId === "zone_rublevka");

    expect(rublevka).toBeDefined();
    expect(isPointInZoneGeometry(TVERSKAYA_7, rublevka!.polygon)).toBe(false);
  });

  it("resolves central Moscow addresses to the center zone", async () => {
    const zone = await findZone(TVERSKAYA_7);

    expect(zone.inZone).toBe(true);
    expect(zone.zoneId).toBe("zone_center_msk");
  });
});
