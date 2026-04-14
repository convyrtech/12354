type BuildMapLinkInput = {
  label?: string | null;
  lat?: number | null;
  lng?: number | null;
};

function normalizeLabel(label: string | null | undefined) {
  return label?.trim() || "Москва";
}

export function buildYandexMapsHref(input: BuildMapLinkInput) {
  const params = new URLSearchParams();
  const label = normalizeLabel(input.label);

  params.set("text", label);
  params.set("mode", "search");

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    params.set("ll", `${input.lng},${input.lat}`);
    params.set("z", "16");
  }

  return `https://yandex.ru/maps/?${params.toString()}`;
}

export function buildTwoGisHref(input: BuildMapLinkInput) {
  const label = normalizeLabel(input.label);

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    return `https://2gis.ru/moscow/search/${encodeURIComponent(
      `${label} ${input.lng},${input.lat}`,
    )}`;
  }

  return `https://2gis.ru/moscow/search/${encodeURIComponent(label)}`;
}
