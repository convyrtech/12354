import type { CityId } from "@/lib/cities/cities-config";

export type KitchenStatus = "active" | "coming-soon";

export type KitchenConfig = {
  id: string;
  cityId: CityId;
  name: string;
  addressLabel: string;
  status: KitchenStatus;
  legacyLocationId?: string;
  legacyServicePointIds?: string[];
};

export const kitchens: KitchenConfig[] = [
  {
    id: "osorgino",
    cityId: "moscow",
    name: "Осоргино 202",
    addressLabel: "Осоргино, 202",
    status: "active",
    legacyLocationId: "loc_lesnoy_01",
    legacyServicePointIds: ["sp_lesnoy_dispatch_01", "sp_lesnoy_pickup_01"],
  },
  {
    id: "moscow-center",
    cityId: "moscow",
    name: "Москва Центр",
    addressLabel: "Центр Москвы",
    status: "coming-soon",
    legacyLocationId: "loc_moscow_center_01",
  },
  {
    id: "moscow-south",
    cityId: "moscow",
    name: "Москва Юг",
    addressLabel: "Юг Москвы",
    status: "coming-soon",
  },
];

const kitchensById = new Map(kitchens.map((kitchen) => [kitchen.id, kitchen]));

const activeKitchensByCityId = new Map<CityId, KitchenConfig[]>();
for (const kitchen of kitchens) {
  if (kitchen.status !== "active") continue;
  const bucket = activeKitchensByCityId.get(kitchen.cityId) ?? [];
  bucket.push(kitchen);
  activeKitchensByCityId.set(kitchen.cityId, bucket);
}

export function getKitchen(kitchenId: string): KitchenConfig | null {
  return kitchensById.get(kitchenId) ?? null;
}

export function getKitchensForCity(cityId: CityId): KitchenConfig[] {
  return kitchens.filter((kitchen) => kitchen.cityId === cityId);
}

export function getActiveKitchensForCity(cityId: CityId): KitchenConfig[] {
  return activeKitchensByCityId.get(cityId) ?? [];
}

export function getKitchenByLegacyLocationId(
  locationId: string,
): KitchenConfig | null {
  return (
    kitchens.find((kitchen) => kitchen.legacyLocationId === locationId) ?? null
  );
}
