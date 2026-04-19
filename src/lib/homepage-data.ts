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
 * MENU_ENTRY — finale CTA block ("Invitation" beat).
 * Single call to action with a typographic underline flourish on
 * «начинается». Headline structure is inlined in the component
 * (не через data-поля), since the emphasis span is specific to
 * this one section and doesn't reuse the lead/italic pattern.
 */
export const MENU_ENTRY = {
  cta: { label: "К меню", href: "/menu?fulfillment=delivery" },
} as const;

/**
 * MENU_ENTRY_INFO — finale "cream card" footer content that now
 * lives inside the CTA section (replacing the old standalone
 * Footer component). Contacts are placeholders pending real data.
 */
export const MENU_ENTRY_INFO = {
  columns: [
    {
      title: "Доставка",
      lines: [
        "Москва и ближнее Подмосковье",
        "",
        "Самовывоз",
        "Осоргино, 202",
      ],
    },
    {
      title: "Контакты",
      lines: [
        "+7 495 XXX-XX-XX",
        "team@theraki.ru",
        "Telegram: @theraki",
      ],
    },
    {
      title: "В прессе",
      lines: ["Коммерсантъ", "Рублёвка Gold"],
    },
  ],
  wordmark: "— The Raki · С 2017 —",
} as const;

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
