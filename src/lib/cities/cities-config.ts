export type CityStatus = "active" | "coming-soon";

export type PricingTier = "central" | "south" | "north";

export const CITY_IDS = ["moscow", "krasnodar", "sochi", "spb"] as const;
export type CityId = (typeof CITY_IDS)[number];

export type CityConfig = {
  id: CityId;
  name: string;
  genitive: string;
  status: CityStatus;
  timezone: string;
  kitchens: string[];
  pricingTier: PricingTier;
  comingSoonLabel?: string;
  comingSoonNote?: string;
};

export const DEFAULT_CITY_ID: CityId = "moscow";

export const cities: CityConfig[] = [
  {
    id: "moscow",
    name: "Москва",
    genitive: "Москвы",
    status: "active",
    timezone: "Europe/Moscow",
    kitchens: ["osorgino", "moscow-center", "moscow-south"],
    pricingTier: "central",
  },
  {
    id: "krasnodar",
    name: "Краснодар",
    genitive: "Краснодара",
    status: "coming-soon",
    timezone: "Europe/Moscow",
    kitchens: [],
    pricingTier: "south",
    comingSoonLabel: "откроем в 2026",
    comingSoonNote:
      "Готовим маршрут и кухню. Если оставите номер — напишем, когда поедем.",
  },
  {
    id: "sochi",
    name: "Сочи",
    genitive: "Сочи",
    status: "coming-soon",
    timezone: "Europe/Moscow",
    kitchens: [],
    pricingTier: "south",
    comingSoonLabel: "откроем в 2026",
    comingSoonNote:
      "Южная точка следом за Краснодаром. Логистика живой доставки решается отдельно.",
  },
  {
    id: "spb",
    name: "Санкт-Петербург",
    genitive: "Санкт-Петербурга",
    status: "coming-soon",
    timezone: "Europe/Moscow",
    kitchens: [],
    pricingTier: "north",
    comingSoonLabel: "откроем в 2027",
    comingSoonNote: "Северная точка — позже, после южного плеча.",
  },
];

const citiesById = new Map(cities.map((city) => [city.id, city]));

const defaultCity = citiesById.get(DEFAULT_CITY_ID);
if (!defaultCity) {
  throw new Error(
    `cities-config: DEFAULT_CITY_ID "${DEFAULT_CITY_ID}" is not in the cities list.`,
  );
}

export function getCity(cityId: string): CityConfig | null {
  return citiesById.get(cityId as CityId) ?? null;
}

export function getDefaultCity(): CityConfig {
  return defaultCity!;
}

export function getActiveCities(): CityConfig[] {
  return cities.filter((city) => city.status === "active");
}

export function getComingSoonCities(): CityConfig[] {
  return cities.filter((city) => city.status === "coming-soon");
}

export function isValidCityId(value: string): value is CityId {
  return citiesById.has(value as CityId);
}
