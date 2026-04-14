export type YandexSuggestItem = {
  id?: string;
  title: string;
  subtitle?: string | null;
  formattedAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type FetchYandexAddressSuggestionsInput = {
  query: string;
  sessionToken?: string;
};

const yandexMapsApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";
const yandexSuggestApiKey =
  process.env.NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY ?? yandexMapsApiKey;

export function hasYandexMapsApiKey(): boolean {
  return Boolean(yandexMapsApiKey);
}

export function hasYandexSuggestApiKey(): boolean {
  return Boolean(yandexSuggestApiKey);
}

export async function fetchYandexAddressSuggestions(
  input: FetchYandexAddressSuggestionsInput,
): Promise<YandexSuggestItem[]> {
  if (!hasYandexSuggestApiKey() || input.query.trim().length < 3) {
    return [];
  }

  // Runtime integration stays intentionally conservative until production keys are wired.
  return [];
}
