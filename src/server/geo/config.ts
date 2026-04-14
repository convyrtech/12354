import type { GeoAddressProviderName, GeoRoutingProviderName } from "@/lib/geo/types";

export type GeoSuggestProviderName = Extract<
  GeoAddressProviderName,
  "dadata" | "fallback" | "manual"
>;

export type GeoZoneProviderName = "static" | "file";

export type GeoRuntimeConfig = {
  suggestProvider: GeoSuggestProviderName;
  routingProvider: GeoRoutingProviderName;
  zoneProvider: GeoZoneProviderName;
  enableLiveSuggest: boolean;
  enableLiveQuote: boolean;
  enableLiveMap: boolean;
  enablePaidProvider: boolean;
  dadataApiKey: string | null;
  tomtomApiKey: string | null;
  twoGisApiKey: string | null;
  zoneFile: string | null;
};

const TRUE_FLAG_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_FLAG_VALUES = new Set(["0", "false", "no", "off"]);

function readOptionalEnvString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (TRUE_FLAG_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_FLAG_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
}

function readSuggestProvider(value: string | undefined): GeoSuggestProviderName {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "fallback" || normalized === "manual") {
    return normalized;
  }

  return "dadata";
}

function readRoutingProvider(value: string | undefined): GeoRoutingProviderName {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "2gis" || normalized === "fallback") {
    return normalized;
  }

  return "tomtom";
}

function readZoneProvider(value: string | undefined): GeoZoneProviderName {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "file") {
    return "file";
  }

  return "static";
}

export function getGeoRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): GeoRuntimeConfig {
  return {
    suggestProvider: readSuggestProvider(env.GEO_SUGGEST_PROVIDER),
    routingProvider: readRoutingProvider(env.GEO_ROUTING_PROVIDER),
    zoneProvider: readZoneProvider(env.GEO_ZONE_PROVIDER),
    enableLiveSuggest: readBooleanEnv(env.GEO_ENABLE_LIVE_SUGGEST, false),
    enableLiveQuote: readBooleanEnv(env.GEO_ENABLE_LIVE_QUOTE, false),
    enableLiveMap: readBooleanEnv(env.GEO_ENABLE_LIVE_MAP, false),
    enablePaidProvider: readBooleanEnv(env.GEO_ENABLE_PAID_PROVIDER, false),
    dadataApiKey: readOptionalEnvString(env.DADATA_API_KEY),
    tomtomApiKey: readOptionalEnvString(env.TOMTOM_API_KEY),
    twoGisApiKey: readOptionalEnvString(env.TWOGIS_API_KEY),
    zoneFile: readOptionalEnvString(env.GEO_ZONE_FILE),
  };
}

export function hasLiveSuggestConfig(config: GeoRuntimeConfig) {
  return config.enableLiveSuggest && config.suggestProvider === "dadata" && config.dadataApiKey !== null;
}

export function hasLiveRoutingConfig(config: GeoRuntimeConfig) {
  if (!config.enableLiveQuote) {
    return false;
  }

  if (config.routingProvider === "2gis") {
    return config.twoGisApiKey !== null;
  }

  if (config.routingProvider === "tomtom") {
    return config.tomtomApiKey !== null;
  }

  return true;
}
