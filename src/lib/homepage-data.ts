/**
 * Homepage content — Marine-adjacent lyrical structure.
 * Per design doc P3/P7: each block uses lead/italic/tail pattern
 * so italic accents stay rendered as <em> in JSX.
 * Regenerated 2026-04-14 in Tranche A1.c.
 */

/**
 * HERO copy is intentionally minimal — only factual elements that
 * have been explicitly confirmed by the brand owner. All prior
 * "lyrical" placeholders (Ровно тогда когда нужно..., Своя кухня
 * свои курьеры..., etc) were invented by the implementer and got
 * rejected. Strapline/summary/CTA intentionally absent until the
 * owner supplies real brand voice copy.
 *
 * Structure: eyebrow (city + year) + 2-line wordmark title.
 * Minimum luxury layout (Hermès / Goyard pattern).
 */
export const HERO_SCENE = {
  image: "/editorial/hero-crawfish.png",
  eyebrow: "Москва · с 2017",
  titleLead: "THE",
  titleItalic: "Raki",
} as const;

/**
 * MANIFESTO block — replaces former QUALITY_PROOF chip grid.
 * Single lyrical serif manifesto, no items, no bullets.
 */
export const QUALITY_PROOF = {
  eyebrow: "Философия",
  lead: "The Raki — это",
  italic: "не доставка еды,",
  tail: "а доставленный момент: живой, точный, настоящий. Тот самый, который нельзя повторить, если хоть что-то пошло не так.",
  image: "/editorial/cold-crawfish.png",
} as const;

/**
 * EXPERIENCE block — replaces former PRODUCT_THEATRE chip points.
 * Operational truth folded into lyrical serif, not bullets.
 */
export const PRODUCT_THEATRE = {
  eyebrow: "Опыт и доверие",
  lead: "С 2017 года мы держим одно правило:",
  italic: "всё решают минуты.",
  tail: "Свои курьеры учат продукт, не маршрут. Своя кухня работает только на доставку. Мы контролируем каждый метр пути — от бульона до вашего стола.",
  image: "/editorial/boiling-crawfish.png",
} as const;

/**
 * MENU_ENTRY — Marine-style CTA block.
 * Centered display serif with italic accent on key word + single CTA.
 */
export const MENU_ENTRY = {
  eyebrow: "Меню",
  lead: "Ваш стол",
  italic: "начинается здесь.",
  summary:
    "Раки, камчатский краб и деликатесы — в спокойном каталоге без лишних решений.",
  cta: { label: "Открыть меню", href: "/menu?fulfillment=delivery" },
} as const;

export const HOME_CONTACT_LINES = [
  { label: "Телефон", value: "+7 (980) 888-05-88", href: "tel:+79808880588" },
  { label: "Telegram", value: "@The_raki", href: "https://t.me/The_raki" },
  {
    label: "Instagram",
    value: "@the_raki_moscow",
    href: "https://www.instagram.com/the_raki_moscow/",
  },
] as const;

export function getResetPatch(
  fulfillmentMode: "delivery" | "pickup",
  orderStage: "menu" | "context",
) {
  return {
    fulfillmentMode,
    deliveryState: null,
    pickupState: null,
    zoneId: null,
    locationId: null,
    servicePointId: null,
    legalEntityId: null,
    resolverNote: "",
    serviceLabel: "",
    serviceTimingLabel: "",
    typedAddress: "",
    normalizedAddress: "",
    confirmedDropoffLabel: "",
    confirmedDropoffSource: null,
    confirmedDropoffLat: null,
    confirmedDropoffLng: null,
    addressConfidence: null,
    courierInstructions: "",
    deliveryFulfillmentSource: null,
    deliveryVipOverride: false,
    deliverySensitiveRoute: false,
    deliveryDecisionState: null,
    deliveryDecisionNote: "",
    liveDeliveryQuoteAmount: null,
    timingIntent: null,
    requestedTimeSlotId: null,
    requestedTimeLabel: "",
    orderStage,
  };
}
