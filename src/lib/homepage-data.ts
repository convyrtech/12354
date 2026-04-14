export const HERO_SCENE = {
  image: "/editorial/hero-crawfish.png",
  eyebrow: "The Raki • Moscow",
  title: ["Свежие раки и краб.", "Точная подача."],
  summary: "Private service по Москве и МО.",
  facts: ["с 2017", "москва и мо", "живой продукт", "горячая подача"],
} as const;

export const PRODUCT_THEATRE = {
  eyebrow: "Подача",
  title: "Живой продукт. Чистая подача.",
  summary: "Никакого шума. Только фактура, температура и вкус, собранные как дорогой private service.",
  image: "/editorial/boiling-crawfish.png",
  points: ["лёд и холод", "бульон и пар", "лимон и фарфор"],
} as const;

export const QUALITY_PROOF = {
  eyebrow: "Качество",
  title: "Серьёзное обращение с продуктом.",
  summary: "The Raki держит спокойный, точный уровень сервиса с 2017 года.",
  image: "/editorial/cold-crawfish.png",
  items: [
    { value: "2017", label: "работаем в Москве" },
    { value: "fresh", label: "живой продукт и холод" },
    { value: "hot", label: "горячая подача и бульон" },
    { value: "service", label: "private-service тон" },
  ],
} as const;

export const SERVICE_STAGE = {
  eyebrow: "Сервис",
  title: ["Быстро.", "Спокойно.", "Без компромиссов."],
  summary: "Привозим в идеальном состоянии и без лишнего шума вокруг заказа.",
  truths: ["Москва и МО", "идеальное состояние", "точная подача"],
  image: "/editorial/service-broth.png",
} as const;

export const MENU_ENTRY = {
  eyebrow: "Меню",
  title: "Меню как аккуратный вход, а не вторая главная.",
  summary: "Один спокойный переход в каталог без таксономии на первом экране.",
  links: [
    { label: "Смотреть меню", href: "/menu?fulfillment=delivery" },
    { label: "К столу", href: "/menu?fulfillment=delivery" },
    { label: "Подарки и деликатесы", href: "/menu?fulfillment=delivery" },
  ],
} as const;

export const HOME_CONTACT_LINES = [
  { label: "Телефон", value: "+7 (980) 888-05-88", href: "tel:+79808880588" },
  { label: "Telegram", value: "@The_raki", href: "https://t.me/The_raki" },
  { label: "Instagram", value: "@the_raki_moscow", href: "https://www.instagram.com/the_raki_moscow/" },
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
