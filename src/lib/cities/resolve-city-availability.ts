import type {
  FulfillmentMode,
  MenuAvailabilityState,
  MenuItem,
  MenuKitchenAvailability,
} from "@/lib/fixtures";
import { getServicePoint, pickHighestAvailabilityPriority } from "@/lib/fixtures";
import { getCity } from "@/lib/cities/cities-config";
import {
  getActiveKitchensForCity,
  getKitchen,
  type KitchenConfig,
} from "@/lib/cities/kitchens-config";

function servicePointMatchesMode(
  servicePointId: string,
  fulfillmentMode: FulfillmentMode,
): boolean {
  const sp = getServicePoint(servicePointId);
  if (!sp) return true;
  if (fulfillmentMode === "pickup") return sp.pointType === "pickup_counter";
  return sp.pointType === "dispatch_kitchen";
}

export type CityAvailabilityResult = {
  state: MenuAvailabilityState;
  reason: string;
  contributingKitchens: Array<{ kitchenId: string; state: MenuAvailabilityState }>;
};

function resolveKitchenStateForItem(
  item: MenuItem,
  kitchen: KitchenConfig,
  fulfillmentMode: FulfillmentMode,
): MenuAvailabilityState {
  const direct = item.kitchenAvailability?.find(
    (entry: MenuKitchenAvailability) => entry.kitchenId === kitchen.id,
  );
  if (direct) return direct.state;

  if (kitchen.legacyLocationId) {
    const legacyLocation = item.locationAvailability?.find(
      (entry) => entry.locationId === kitchen.legacyLocationId,
    );
    if (legacyLocation) return legacyLocation.state;
  }

  if (kitchen.legacyServicePointIds?.length) {
    const legacyServicePoints = (item.servicePointAvailability ?? []).filter(
      (entry) =>
        kitchen.legacyServicePointIds?.includes(entry.servicePointId) &&
        servicePointMatchesMode(entry.servicePointId, fulfillmentMode),
    );
    if (legacyServicePoints.length > 0) {
      return pickHighestAvailabilityPriority(
        legacyServicePoints.map((sp) => sp.state),
      );
    }
  }

  if (!item.availableFor.includes(fulfillmentMode)) {
    return "hidden";
  }

  return "available";
}

function reasonFor(
  state: MenuAvailabilityState,
  cityName: string,
): string {
  switch (state) {
    case "available":
      return `Готовим на одной из кухонь ${cityName}.`;
    case "sold_out":
      return "Сегодня закончилось — вернём завтра.";
    case "planned":
      return "Позиция ещё не вышла на кухни города.";
    case "hidden":
      return "Сейчас не готовим в этом городе.";
  }
}

export function resolveAvailabilityForCity(
  item: MenuItem,
  cityId: string,
  fulfillmentMode: FulfillmentMode,
): CityAvailabilityResult {
  const city = getCity(cityId);
  if (!city) {
    return {
      state: "hidden",
      reason: "Город не найден в конфигурации.",
      contributingKitchens: [],
    };
  }

  if (city.status === "coming-soon") {
    return {
      state: "hidden",
      reason: `В ${city.genitive} пока не работаем.`,
      contributingKitchens: [],
    };
  }

  const activeKitchens = getActiveKitchensForCity(city.id);
  if (activeKitchens.length === 0) {
    return {
      state: "hidden",
      reason: `В ${city.genitive} нет активных кухонь.`,
      contributingKitchens: [],
    };
  }

  const perKitchen = activeKitchens.map((kitchen) => ({
    kitchenId: kitchen.id,
    state: resolveKitchenStateForItem(item, kitchen, fulfillmentMode),
  }));

  const aggregate = pickHighestAvailabilityPriority(
    perKitchen.map((entry) => entry.state),
  );

  return {
    state: aggregate,
    reason: reasonFor(aggregate, city.name),
    contributingKitchens: perKitchen,
  };
}

export function resolveAvailabilityForKitchen(
  item: MenuItem,
  kitchenId: string,
  fulfillmentMode: FulfillmentMode,
): CityAvailabilityResult {
  const kitchen = getKitchen(kitchenId);
  if (!kitchen) {
    return {
      state: "hidden",
      reason: "Кухня не найдена.",
      contributingKitchens: [],
    };
  }

  const state = resolveKitchenStateForItem(item, kitchen, fulfillmentMode);
  return {
    state,
    reason: reasonFor(state, kitchen.name),
    contributingKitchens: [{ kitchenId: kitchen.id, state }],
  };
}
