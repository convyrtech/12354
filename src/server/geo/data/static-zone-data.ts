import type { GeoZoneGeometry } from "@/lib/geo/types";

export type StaticZoneRecord = {
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

export const staticZoneRecords: StaticZoneRecord[] = [
  {
    zoneId: "zone_center_msk",
    label: "Центр Москвы",
    priority: 10,
    deliveryEnabled: true,
    kitchenId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_dispatch_01",
    legalEntityId: "le_raki_core",
    acceptingOrdersUntil: "22:00",
    resolverNote:
      "Центральный московский контур пока обслуживается из активной кухни в Осоргино до запуска отдельного московского dispatch point.",
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [37.3, 55.61],
          [37.67, 55.61],
          [37.67, 55.79],
          [37.3, 55.79],
          [37.3, 55.61],
        ],
      ],
    },
  },
  {
    zoneId: "zone_rublevka",
    label: "Рублёвка",
    priority: 20,
    deliveryEnabled: true,
    kitchenId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_dispatch_01",
    legalEntityId: "le_raki_core",
    acceptingOrdersUntil: "21:30",
    resolverNote:
      "Западный премиальный контур пока также обслуживается из Осоргино до выделения отдельного западного кластера.",
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [37.23, 55.71],
          [37.35, 55.71],
          [37.35, 55.77],
          [37.23, 55.77],
          [37.23, 55.71],
        ],
      ],
    },
  },
];
