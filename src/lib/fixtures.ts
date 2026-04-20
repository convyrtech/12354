import type { DeliveryFulfillmentSource } from "@/lib/delivery-policy";
import type { DraftLineItem } from "@/lib/line-item";
import { getDeliveryPolicy } from "@/lib/delivery-policy";

export type FulfillmentMode = "delivery" | "pickup";
export type DeliveryState = "in-zone" | "out-of-zone" | "cutoff";
export type PickupState = "ready" | "closed" | "delay";
export type CartState = "ready" | "below-minimum" | "invalidated";
export type PaymentMethod = "cash_on_receipt" | "online_card" | "sbp";
export type TimingIntent = "asap" | "scheduled";
export type AddressConfidence = "high" | "medium" | "low";
export type DeliveryDropoffSource = "suggestion" | "map_pin" | "operator_override";
export type NetworkEntityStatus = "active" | "planned";

export type LegalEntity = {
  id: string;
  label: string;
  status: NetworkEntityStatus;
  note: string;
};

export type Location = {
  id: string;
  name: string;
  addressLabel: string;
  regionLabel: string;
  lat: number;
  lng: number;
  status: NetworkEntityStatus;
  operatingHours: { open: string; close: string };
  servicePointIds: string[];
};

export type ServicePoint = {
  id: string;
  label: string;
  locationId: string;
  legalEntityId: string;
  pointType: "dispatch_kitchen" | "pickup_counter";
  status: NetworkEntityStatus;
};

export type RoutingAssignment = {
  locationId: string | null;
  servicePointId: string | null;
  legalEntityId: string | null;
  resolverNote: string;
};

export type RoutingCluster = "center_moscow" | "west_moscow" | "pickup_core" | "unassigned";

export type RoutingRuleKey =
  | "pickup_current_core"
  | "center_cluster_current_core_future_center"
  | "west_cluster_current_core_future_west"
  | "out_of_zone_unassigned"
  | "fallback_current_core";

export type RoutingEvaluation = RoutingAssignment & {
  cluster: RoutingCluster;
  ruleKey: RoutingRuleKey;
  futureLocationId: string | null;
  futureServicePointId: string | null;
  futureLegalEntityId: string | null;
};

export type DeliveryZone = {
  id: string;
  label: string;
  feeAmount: number;
  minimumOrderAmount: number;
  etaLabel: string;
  acceptingOrdersUntil: string;
};

export type TimingSlot = {
  id: string;
  fulfillmentMode: FulfillmentMode;
  zoneId: string | null;
  locationId: string | null;
  servicePointId: string | null;
  label: string;
  targetTime: string;
  startTime: string;
  endTime: string;
  dayOffset: number;
  note: string;
};

export type DeliveryScenario = {
  id: string;
  label: string;
  state: DeliveryState;
  zoneId: string | null;
  note: string;
  typedAddress: string;
  normalizedAddress: string | null;
  confirmedDropoffLabel: string | null;
  confirmedDropoffSource: DeliveryDropoffSource | null;
  confirmedDropoffLat: number | null;
  confirmedDropoffLng: number | null;
  addressConfidence: AddressConfidence | null;
  courierInstructions: string;
  fulfillmentSource: DeliveryFulfillmentSource | null;
  liveQuoteAmount: number | null;
  etaLabelOverride?: string | null;
  vipOverride?: boolean;
  sensitiveRoute?: boolean;
  assignment?: RoutingAssignment;
};

export type DropoffCorrectionOption = {
  id: string;
  label: string;
  note: string;
  normalizedAddress: string;
  confirmedDropoffLabel: string;
  confirmedDropoffSource: DeliveryDropoffSource;
  confirmedDropoffLat: number;
  confirmedDropoffLng: number;
  addressConfidence: AddressConfidence;
  courierInstructions: string;
  etaAdjustmentMinutes?: number;
};

export type ModifierOption = {
  id: string;
  label: string;
  priceDelta: number;
};

export type ModifierGroupKind = "core" | "secondary";

export type ModifierGroup = {
  id: string;
  label: string;
  kind: ModifierGroupKind;
  minSelections: number;
  maxSelections: number;
  helpText?: string;
  options: ModifierOption[];
};

export type MenuAvailabilityState = "available" | "hidden" | "planned" | "sold_out";

const AVAILABILITY_STATE_PRIORITY: Record<MenuAvailabilityState, number> = {
  available: 0,
  sold_out: 1,
  planned: 2,
  hidden: 3,
};

export function pickHighestAvailabilityPriority(
  states: readonly MenuAvailabilityState[],
): MenuAvailabilityState {
  return states.reduce((best, current) =>
    AVAILABILITY_STATE_PRIORITY[current] < AVAILABILITY_STATE_PRIORITY[best]
      ? current
      : best,
  );
}

export type MenuLocationAvailability = {
  locationId: string;
  state: MenuAvailabilityState;
  note?: string;
  priceDelta?: number;
};

export type MenuServicePointAvailability = {
  servicePointId: string;
  state: MenuAvailabilityState;
  note?: string;
  priceDelta?: number;
};

export type MenuKitchenAvailability = {
  kitchenId: string;
  state: MenuAvailabilityState;
  note?: string;
  priceDelta?: number;
};

export type BundledAccessory = {
  id: string;
  title: string;
  perUnit: "item" | "kg";
  quantity: number;
  note?: string;
};

export type UpsellAccessory = {
  id: string;
  title: string;
  price: number;
  note?: string;
};

export type MenuItemBadge = "hit" | "new";

export type MenuItemMetadata = {
  weight?: { value: number; unit: "g" | "kg" };
  origin?: string;
  serving?: string;
};

export type ProductOrderingModel = "standard" | "weight_based";

export type SeasonalProductRequestRule = {
  label: string;
  seasonLabel: string;
  activeMonths: number[];
  note: string;
};

export type ProductCommercialRules = {
  orderingModel: ProductOrderingModel;
  minimumWeightKg?: number;
  weightStepKg?: number;
  recipeAffectsPrice?: boolean;
  seasonalRequest?: SeasonalProductRequestRule;
};

export type MenuItem = {
  id: string;
  category: string;
  productFamily: string;
  name: string;
  description: string;
  basePrice: number;
  availableFor: FulfillmentMode[];
  modifierGroups: ModifierGroup[];
  bestEffortRequests?: string[];
  note?: string;
  commercialRules?: ProductCommercialRules;
  locationAvailability?: MenuLocationAvailability[];
  servicePointAvailability?: MenuServicePointAvailability[];
  kitchenAvailability?: MenuKitchenAvailability[];
  categorySlug?: string;
  subcategory?: string;
  editorialNote?: string;
  badge?: MenuItemBadge;
  isSignature?: boolean;
  metadata?: MenuItemMetadata;
  imageKey?: string;
  bundledAccessories?: BundledAccessory[];
  upsellAccessories?: UpsellAccessory[];
};

export type MenuSnapshotItem = {
  item: MenuItem;
  state: MenuAvailabilityState;
  reason: string;
  effectiveBasePrice: number;
  priceDelta: number;
};

export type DraftLineRevalidationIssueType = "item_unavailable" | "point_price_changed";

export type DraftLineRevalidationIssue = {
  type: DraftLineRevalidationIssueType;
  lineIndex: number;
  itemId: string;
  itemName: string;
  snapshotState: MenuAvailabilityState;
  reason: string;
  previousBasePrice: number;
  currentBasePrice: number;
};

export const legalEntities: LegalEntity[] = [
  {
    id: "le_raki_core",
    label: "The Raki core legal entity",
    status: "active",
    note: "Current operating entity while the network still runs from Osorgino 202.",
  },
  {
    id: "le_raki_future_west",
    label: "Future west-cluster legal entity",
    status: "planned",
    note: "Placeholder for franchise-ready west-cluster routing and settlement.",
  },
  {
    id: "le_raki_future_center",
    label: "Future center-cluster legal entity",
    status: "planned",
    note: "Placeholder for future center-Moscow points and separate entity routing.",
  },
];

export const locations: Location[] = [
  {
    id: "loc_lesnoy_01",
    name: "Осоргино, 202",
    addressLabel: "Осоргино, 202",
    regionLabel: "Одинцовский кластер",
    lat: 55.6584,
    lng: 37.2318,
    status: "active",
    operatingHours: { open: "12:00", close: "23:00" },
    servicePointIds: ["sp_lesnoy_dispatch_01", "sp_lesnoy_pickup_01"],
  },
  {
    id: "loc_moscow_west_01",
    name: "Москва Запад",
    addressLabel: "Кутузовский / Рублёвка",
    regionLabel: "Западный кластер Москвы",
    lat: 55.7381,
    lng: 37.4084,
    status: "planned",
    operatingHours: { open: "12:00", close: "23:00" },
    servicePointIds: ["sp_moscow_west_dispatch_01"],
  },
  {
    id: "loc_moscow_center_01",
    name: "Москва Центр",
    addressLabel: "Центр Москвы",
    regionLabel: "Центральный кластер Москвы",
    lat: 55.7567,
    lng: 37.6187,
    status: "planned",
    operatingHours: { open: "12:00", close: "23:00" },
    servicePointIds: ["sp_moscow_center_dispatch_01"],
  },
];

export const servicePoints: ServicePoint[] = [
  {
    id: "sp_lesnoy_dispatch_01",
    label: "Кухня в Осоргино, 202",
    locationId: "loc_lesnoy_01",
    legalEntityId: "le_raki_core",
    pointType: "dispatch_kitchen",
    status: "active",
  },
  {
    id: "sp_lesnoy_pickup_01",
    label: "Самовывоз в Осоргино, 202",
    locationId: "loc_lesnoy_01",
    legalEntityId: "le_raki_core",
    pointType: "pickup_counter",
    status: "active",
  },
  {
    id: "sp_moscow_west_dispatch_01",
    label: "Кухня в Москве Запад",
    locationId: "loc_moscow_west_01",
    legalEntityId: "le_raki_future_west",
    pointType: "dispatch_kitchen",
    status: "planned",
  },
  {
    id: "sp_moscow_center_dispatch_01",
    label: "Кухня в Москве Центр",
    locationId: "loc_moscow_center_01",
    legalEntityId: "le_raki_future_center",
    pointType: "dispatch_kitchen",
    status: "planned",
  },
];

export const zones: DeliveryZone[] = [
  {
    id: "zone_center_msk",
    label: "Центр Москвы",
    feeAmount: getDeliveryPolicy("zone_center_msk")?.guestFeeAmount ?? 500,
    minimumOrderAmount: getDeliveryPolicy("zone_center_msk")?.minimumOrderAmount ?? 5000,
    etaLabel: "90-120 мин",
    acceptingOrdersUntil: "22:00",
  },
  {
    id: "zone_rublevka",
    label: "Рублёвка",
    feeAmount: getDeliveryPolicy("zone_rublevka")?.guestFeeAmount ?? 700,
    minimumOrderAmount: getDeliveryPolicy("zone_rublevka")?.minimumOrderAmount ?? 7000,
    etaLabel: "110-140 мин",
    acceptingOrdersUntil: "21:30",
  },
];

export const deliveryScenarios: DeliveryScenario[] = [
  {
    id: "delivery_tverskaya_7",
    label: "Тверская, 7",
    state: "in-zone" as DeliveryState,
    zoneId: "zone_center_msk",
    note: "Базовый сильный маршрут: здесь доставка должна ощущаться уверенно и без лишней ручной проверки.",
    typedAddress: "Тверская, 7",
    normalizedAddress: "Тверская улица, 7, Москва",
    confirmedDropoffLabel: "Центральный вход, Тверская, 7",
    confirmedDropoffSource: "suggestion",
    confirmedDropoffLat: 55.7584,
    confirmedDropoffLng: 37.6132,
    addressConfidence: "high",
    courierInstructions: "",
    fulfillmentSource: "own_courier",
    liveQuoteAmount: 500,
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "Сейчас этот адрес ещё обслуживается из Осоргино, 202. После запуска московской центральной точки маршрут должен переключаться туда без изменения storefront-контракта.",
    },
  },
  {
    id: "delivery_barvikha",
    label: "Барвиха, Рублёвка",
    state: "in-zone" as DeliveryState,
    zoneId: "zone_rublevka",
    note: "Премиальный дальний адрес. Обещание должно звучать спокойно и аккуратно.",
    typedAddress: "Барвиха",
    normalizedAddress: "деревня Барвиха, Рублёвка",
    confirmedDropoffLabel: "Главный въезд, резиденция Барвиха",
    confirmedDropoffSource: "suggestion",
    confirmedDropoffLat: 55.7426,
    confirmedDropoffLng: 37.2834,
    addressConfidence: "high",
    courierInstructions: "",
    fulfillmentSource: "own_courier",
    liveQuoteAmount: 700,
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "Сейчас Рублёвка ещё обслуживается из Осоргино, 202. После запуска западного кластера маршрут должен переключаться туда.",
    },
  },
  {
    id: "delivery_barvikha_overflow",
    label: "Барвиха, перегруз курьеров",
    state: "in-zone" as DeliveryState,
    zoneId: "zone_rublevka",
    note: "Своих курьеров не хватает. Внешняя доставка возможна, но финальное обещание должно уходить в ручную проверку.",
    typedAddress: "Барвиха",
    normalizedAddress: "деревня Барвиха, Рублёвка",
    confirmedDropoffLabel: "Главный въезд, резиденция Барвиха",
    confirmedDropoffSource: "suggestion",
    confirmedDropoffLat: 55.7426,
    confirmedDropoffLng: 37.2834,
    addressConfidence: "high",
    courierInstructions: "",
    fulfillmentSource: "overflow_provider",
    liveQuoteAmount: 1900,
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "Сейчас адрес резолвится в Осоргино, 202, но перегруз курьеров переводит финальное обещание в ручную проверку. После запуска западного кластера эта зависимость должна снизиться.",
    },
  },
  {
    id: "delivery_quote_pending",
    label: "Кутузовский, ждём расчёт по адресу",
    state: "in-zone" as DeliveryState,
    zoneId: "zone_center_msk",
    note: "Внешняя доставка может понадобиться, но живой тариф ещё не подтвердился.",
    typedAddress: "Кутузовский, 57",
    normalizedAddress: "Кутузовский проспект, 57, Москва",
    confirmedDropoffLabel: "Главный вход, Кутузовский, 57",
    confirmedDropoffSource: "suggestion",
    confirmedDropoffLat: 55.7273,
    confirmedDropoffLng: 37.4773,
    addressConfidence: "high",
    courierInstructions: "",
    fulfillmentSource: "overflow_provider",
    liveQuoteAmount: null,
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "Маршрут уже можно привязать к точке исполнения, даже если итоговый расчёт по внешнему курьеру ещё не подтверждён.",
    },
  },
  {
    id: "delivery_eta_stretched",
    label: "Патрики, время растянулось",
    state: "in-zone" as DeliveryState,
    zoneId: "zone_center_msk",
    note: "Адрес валидный, но загрузка растягивает обещание дольше комфортного самостоятельного сценария.",
    typedAddress: "Анны Ахматовой, 8",
    normalizedAddress: "улица Анны Ахматовой, 8, Москва",
    confirmedDropoffLabel: "Въезд со стороны двора за домом 8",
    confirmedDropoffSource: "map_pin",
    confirmedDropoffLat: 55.6388,
    confirmedDropoffLng: 37.3473,
    addressConfidence: "medium",
    courierInstructions: "Точку сместили на внутридворовый подъезд.",
    fulfillmentSource: "own_courier",
    liveQuoteAmount: 500,
    etaLabelOverride: "160-190 мин",
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "Адрес валидный, но растянутое обещание по времени показывает, что текущая одна точка уже работает на пределе. Будущая центральная кухня должна забрать этот маршрут на себя.",
    },
  },
  {
    id: "delivery_vip_override",
    label: "VIP-маршрут через помощника",
    state: "in-zone" as DeliveryState,
    zoneId: "zone_center_msk",
    note: "Обычная доставка возможна, но сам маршрут требует более деликатной ручной проверки.",
    typedAddress: "центр Москвы, передача через помощника",
    normalizedAddress: "служебный адрес в центре Москвы",
    confirmedDropoffLabel: "Подтверждённая точка передачи заказа",
    confirmedDropoffSource: "operator_override",
    confirmedDropoffLat: 55.7558,
    confirmedDropoffLng: 37.6173,
    addressConfidence: "high",
    courierInstructions: "Сначала звонок контакту. В звонок по месту не уходить.",
    fulfillmentSource: "own_courier",
    liveQuoteAmount: 500,
    vipOverride: true,
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "VIP routes still resolve to the current active kitchen, but should later support protected routing rules across multiple Moscow points.",
    },
  },
  {
    id: "delivery_sensitive_route",
    label: "Чувствительный маршрут",
    state: "in-zone" as DeliveryState,
    zoneId: "zone_rublevka",
    note: "Сам адрес валидный, но точка передачи чувствительная и требует ручного подтверждения.",
    typedAddress: "чувствительный адрес на Рублёвке",
    normalizedAddress: "подтверждённый адрес передачи на Рублёвке",
    confirmedDropoffLabel: "Контролируемая точка передачи",
    confirmedDropoffSource: "operator_override",
    confirmedDropoffLat: 55.7501,
    confirmedDropoffLng: 37.2924,
    addressConfidence: "high",
    courierInstructions: "Использовать контролируемый сценарий передачи только после подтверждения оператора.",
    fulfillmentSource: "own_courier",
    liveQuoteAmount: 700,
    sensitiveRoute: true,
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "Sensitive west-side routes should remain assignable at the point/entity level so future franchise nodes can apply their own protected handoff rules.",
    },
  },
  {
    id: "delivery_zvenigorod",
    label: "Окраина Звенигорода",
    state: "out-of-zone" as DeliveryState,
    zoneId: null,
    note: "Нормальный тест на честный отказ и аккуратный fallback.",
    typedAddress: "окраина Звенигорода",
    normalizedAddress: "окраина Звенигорода, Московская область",
    confirmedDropoffLabel: null,
    confirmedDropoffSource: null,
    confirmedDropoffLat: null,
    confirmedDropoffLng: null,
    addressConfidence: "low",
    courierInstructions: "Адрес вне текущей зоны доставки.",
    fulfillmentSource: null,
    liveQuoteAmount: null,
    assignment: {
      locationId: null,
      servicePointId: null,
      legalEntityId: null,
    resolverNote: "Если адрес вне текущего покрытия, назначение точки вообще не создаётся.",
    },
  },
  {
    id: "delivery_late_request",
    label: "Поздний запрос в 22:35",
    state: "cutoff" as DeliveryState,
    zoneId: "zone_center_msk",
    note: "Проверяем, что ограничение по времени всплывает раньше, чем гость дойдёт до оплаты.",
    typedAddress: "Тверская, 7",
    normalizedAddress: "Тверская улица, 7, Москва",
    confirmedDropoffLabel: "Центральный вход, Тверская, 7",
    confirmedDropoffSource: "suggestion",
    confirmedDropoffLat: 55.7584,
    confirmedDropoffLng: 37.6132,
    addressConfidence: "high",
    courierInstructions: "",
    fulfillmentSource: null,
    liveQuoteAmount: null,
    assignment: {
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      resolverNote:
        "The route can still resolve to a dispatch point even when the current time window forces scheduling or manual confirmation.",
    },
  },
];

const scenarioCorrectionOverrides: Record<string, DropoffCorrectionOption[]> = {
  delivery_barvikha: [
    {
      id: "barvikha_checkpoint_two",
      label: "Точка передачи через КПП-2",
      note: "Используем подтверждённую гостем точку через КПП-2 вместо общего адреса резиденции.",
      normalizedAddress: "Barvikha Village, Rublevka",
      confirmedDropoffLabel: "КПП-2, резиденция Барвиха",
      confirmedDropoffSource: "operator_override",
      confirmedDropoffLat: 55.743,
      confirmedDropoffLng: 37.284,
      addressConfidence: "high",
      courierInstructions: "Подъезд через КПП-2 после подтверждения гостем.",
      etaAdjustmentMinutes: 10,
    },
  ],
  delivery_barvikha_overflow: [
    {
      id: "barvikha_checkpoint_two",
      label: "Точка передачи через КПП-2",
      note: "Используем подтверждённую гостем точку через КПП-2 вместо общего адреса резиденции.",
      normalizedAddress: "Barvikha Village, Rublevka",
      confirmedDropoffLabel: "КПП-2, резиденция Барвиха",
      confirmedDropoffSource: "operator_override",
      confirmedDropoffLat: 55.743,
      confirmedDropoffLng: 37.284,
      addressConfidence: "high",
      courierInstructions: "Подъезд через КПП-2 после подтверждения гостем.",
      etaAdjustmentMinutes: 15,
    },
  ],
  delivery_quote_pending: [
    {
      id: "kutuzovsky_service_entrance",
      label: "Служебный въезд",
      note: "Гость уточнил, что через главный вход не подъехать и нужен служебный въезд.",
      normalizedAddress: "57 Kutuzovsky Prospect, Moscow",
      confirmedDropoffLabel: "Служебный въезд, Кутузовский, 57",
      confirmedDropoffSource: "map_pin",
      confirmedDropoffLat: 55.7271,
      confirmedDropoffLng: 37.4778,
      addressConfidence: "high",
      courierInstructions: "Подъезд через служебный въезд, не через главный вход.",
      etaAdjustmentMinutes: 10,
    },
  ],
  delivery_eta_stretched: [
    {
      id: "akhmatova_front_entrance",
      label: "Фронтальный вход",
      note: "Резервная точка, если подъезд со двора для курьера закрыт.",
      normalizedAddress: "улица Анны Ахматовой, 8, Москва",
      confirmedDropoffLabel: "Главный вход, Анны Ахматовой, 8",
      confirmedDropoffSource: "suggestion",
      confirmedDropoffLat: 55.6385,
      confirmedDropoffLng: 37.347,
      addressConfidence: "medium",
      courierInstructions: "Если двор перекрыт, ехать к главному входу.",
      etaAdjustmentMinutes: 10,
    },
  ],
  delivery_sensitive_route: [
    {
      id: "rublevka_controlled_handoff_b",
      label: "Альтернативная контролируемая передача",
      note: "Гость подтвердил вторичную точку передачи вместо базовой.",
      normalizedAddress: "подтверждённая точка передачи на Рублёвке",
      confirmedDropoffLabel: "Вторая контролируемая точка передачи",
      confirmedDropoffSource: "operator_override",
      confirmedDropoffLat: 55.7504,
      confirmedDropoffLng: 37.2928,
      addressConfidence: "high",
      courierInstructions: "Использовать только после финального подтверждения оператором.",
      etaAdjustmentMinutes: 10,
    },
  ],
};

export const pickupScenarios = [
  {
    id: "pickup_lesnoy_ready",
    label: "Самовывоз, Осоргино, 202",
    state: "ready" as PickupState,
    waitLabel: "20 min",
    note: "Single-point launch but future multi-point model stays intact.",
  },
  {
    id: "pickup_kitchen_delay",
    label: "Kitchen at capacity",
    state: "delay" as PickupState,
    waitLabel: "40 min",
    note: "Pickup stays possible, but constraint must be explicit.",
  },
  {
    id: "pickup_point_closed",
    label: "Point closed",
    state: "closed" as PickupState,
    waitLabel: null,
    note: "Pickup must block honestly, not fail later in checkout.",
  },
];

export const timingSlots: TimingSlot[] = [
  {
    id: "slot_delivery_center_today_1800",
    fulfillmentMode: "delivery",
    zoneId: "zone_center_msk",
    locationId: null,
    servicePointId: null,
    label: "Сегодня к 18:00",
    targetTime: "18:00",
    startTime: "17:45",
    endTime: "18:15",
    dayOffset: 0,
    note: "Самое раннее подтверждённое время на сегодня для центра Москвы. Цель — уложиться примерно в пределах ±15 минут.",
  },
  {
    id: "slot_delivery_center_today_1900",
    fulfillmentMode: "delivery",
    zoneId: "zone_center_msk",
    locationId: null,
    servicePointId: null,
    label: "Сегодня к 19:00",
    targetTime: "19:00",
    startTime: "18:45",
    endTime: "19:15",
    dayOffset: 0,
    note: "Сбалансированное время на сегодня для центра Москвы. Доставка ко времени держится как обещание, а не как широкий слот.",
  },
  {
    id: "slot_delivery_center_today_2000",
    fulfillmentMode: "delivery",
    zoneId: "zone_center_msk",
    locationId: null,
    servicePointId: null,
    label: "Сегодня к 20:00",
    targetTime: "20:00",
    startTime: "19:45",
    endTime: "20:15",
    dayOffset: 0,
    note: "Позднее подтверждённое время на сегодня, которое ещё укладывается в текущую границу приёма для центра.",
  },
  {
    id: "slot_delivery_center_today_2100",
    fulfillmentMode: "delivery",
    zoneId: "zone_center_msk",
    locationId: null,
    servicePointId: null,
    label: "Сегодня к 21:00",
    targetTime: "21:00",
    startTime: "20:45",
    endTime: "21:15",
    dayOffset: 0,
    note: "Последнее подтверждённое время на сегодня перед границей приёма.",
  },
  {
    id: "slot_delivery_center_tomorrow_1200",
    fulfillmentMode: "delivery",
    zoneId: "zone_center_msk",
    locationId: null,
    servicePointId: null,
    label: "Завтра к 12:00",
    targetTime: "12:00",
    startTime: "11:45",
    endTime: "12:15",
    dayOffset: 1,
    note: "Самое раннее подтверждённое время на завтра для центра Москвы. Цель — уложиться примерно в пределах ±15 минут.",
  },
  {
    id: "slot_delivery_center_tomorrow_1400",
    fulfillmentMode: "delivery",
    zoneId: "zone_center_msk",
    locationId: null,
    servicePointId: null,
    label: "Завтра к 14:00",
    targetTime: "14:00",
    startTime: "13:45",
    endTime: "14:15",
    dayOffset: 1,
    note: "Подтверждённое время на завтра для аккуратной премиальной доставки ко времени.",
  },
  {
    id: "slot_delivery_west_today_1800",
    fulfillmentMode: "delivery",
    zoneId: "zone_rublevka",
    locationId: null,
    servicePointId: null,
    label: "Сегодня к 18:00",
    targetTime: "18:00",
    startTime: "17:45",
    endTime: "18:15",
    dayOffset: 0,
    note: "Самое раннее подтверждённое время на сегодня для западного направления с уже учтённым длинным маршрутом.",
  },
  {
    id: "slot_delivery_west_today_1930",
    fulfillmentMode: "delivery",
    zoneId: "zone_rublevka",
    locationId: null,
    servicePointId: null,
    label: "Сегодня к 19:30",
    targetTime: "19:30",
    startTime: "19:15",
    endTime: "19:45",
    dayOffset: 0,
    note: "Позднее подтверждённое время на сегодня для западного направления, которое ещё укладывается в текущую границу.",
  },
  {
    id: "slot_delivery_west_tomorrow_1200",
    fulfillmentMode: "delivery",
    zoneId: "zone_rublevka",
    locationId: null,
    servicePointId: null,
    label: "Завтра к 12:00",
    targetTime: "12:00",
    startTime: "11:45",
    endTime: "12:15",
    dayOffset: 1,
    note: "Самое раннее подтверждённое время на завтра для западного направления.",
  },
  {
    id: "slot_delivery_west_tomorrow_1400",
    fulfillmentMode: "delivery",
    zoneId: "zone_rublevka",
    locationId: null,
    servicePointId: null,
    label: "Завтра к 14:00",
    targetTime: "14:00",
    startTime: "13:45",
    endTime: "14:15",
    dayOffset: 1,
    note: "Подтверждённое время на завтра для западного направления с запасом под чувствительные маршруты.",
  },
  {
    id: "slot_pickup_lesnoy_today_1900",
    fulfillmentMode: "pickup",
    zoneId: null,
    locationId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_pickup_01",
    label: "Сегодня к 19:00",
    targetTime: "19:00",
    startTime: "19:00",
    endTime: "19:15",
    dayOffset: 0,
    note: "Готовность самовывоза к 19:00 на текущей базовой точке.",
  },
  {
    id: "slot_pickup_lesnoy_today_2000",
    fulfillmentMode: "pickup",
    zoneId: null,
    locationId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_pickup_01",
    label: "Сегодня к 20:00",
    targetTime: "20:00",
    startTime: "20:00",
    endTime: "20:15",
    dayOffset: 0,
    note: "Стандартное время самовывоза на сегодня в Лесном Городке.",
  },
  {
    id: "slot_pickup_lesnoy_today_2130",
    fulfillmentMode: "pickup",
    zoneId: null,
    locationId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_pickup_01",
    label: "Сегодня к 21:30",
    targetTime: "21:30",
    startTime: "21:30",
    endTime: "21:45",
    dayOffset: 0,
    note: "Позднее время самовывоза на сегодня перед закрытием.",
  },
  {
    id: "slot_pickup_lesnoy_tomorrow_1200",
    fulfillmentMode: "pickup",
    zoneId: null,
    locationId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_pickup_01",
    label: "Завтра к 12:00",
    targetTime: "12:00",
    startTime: "12:00",
    endTime: "12:15",
    dayOffset: 1,
    note: "Самое раннее время самовывоза на завтра на текущей точке.",
  },
  {
    id: "slot_pickup_lesnoy_tomorrow_1400",
    fulfillmentMode: "pickup",
    zoneId: null,
    locationId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_pickup_01",
    label: "Завтра к 14:00",
    targetTime: "14:00",
    startTime: "14:00",
    endTime: "14:15",
    dayOffset: 1,
    note: "Подтверждённое время самовывоза на завтра, которое держит модель времени честной после закрытия дня.",
  },
];

const crayfishSeasonalRule: SeasonalProductRequestRule = {
  label: "Только самки",
  seasonLabel: "ноябрь-март",
  activeMonths: [11, 12, 1, 2, 3],
  note: "Запрос работает только в сезон и остаётся пожеланием без гарантии по текущей партии, а не жёстким обещанием.",
};

const crayfishWeightOptions: ModifierOption[] = [
  { id: "weight_1kg", label: "1 кг", priceDelta: 0 },
  { id: "weight_1_5kg", label: "1.5 кг", priceDelta: 2450 },
  { id: "weight_2kg", label: "2 кг", priceDelta: 4900 },
];

const boiledCrayfishSizeOptions: ModifierOption[] = [
  { id: "size_s", label: "S • 20-25 шт/кг", priceDelta: -1000 },
  { id: "size_m", label: "M • 14-17 шт/кг", priceDelta: 0 },
  { id: "size_l", label: "L • 11-13 шт/кг", priceDelta: 1000 },
  { id: "size_xl", label: "XL • 8-10 шт/кг", priceDelta: 1800 },
  { id: "size_xxl", label: "XXL • 5-7 шт/кг", priceDelta: 3000 },
];

const friedCrayfishSizeOptions: ModifierOption[] = [
  { id: "fried_size_s", label: "S • 20-25 шт/кг", priceDelta: -1000 },
  { id: "fried_size_m", label: "M • 14-17 шт/кг", priceDelta: 0 },
  { id: "fried_size_l", label: "L • 11-13 шт/кг", priceDelta: 1000 },
  { id: "fried_size_xl", label: "XL • 8-10 шт/кг", priceDelta: 2000 },
  { id: "fried_size_xxl", label: "XXL • 5-7 шт/кг", priceDelta: 3300 },
];

const liveCrayfishSizeOptions: ModifierOption[] = [
  { id: "live_size_s", label: "S • 20-25 шт/кг", priceDelta: -1000 },
  { id: "live_size_m", label: "M • 14-17 шт/кг", priceDelta: 0 },
  { id: "live_size_l", label: "L • 11-13 шт/кг", priceDelta: 1000 },
  { id: "live_size_xl", label: "XL • 8-10 шт/кг", priceDelta: 2000 },
  { id: "live_size_xxl", label: "XXL • 5-7 шт/кг", priceDelta: 3200 },
];

const boiledRecipeOptions: ModifierOption[] = [
  { id: "recipe_classic", label: "Классический", priceDelta: 0 },
  { id: "recipe_garlic_lemon", label: "Чеснок - Лимон", priceDelta: 0 },
  { id: "recipe_hot_pepper", label: "Острый перчик", priceDelta: 0 },
  { id: "recipe_spicy_tomato", label: "Пикантный томат", priceDelta: 0 },
  { id: "recipe_adjika", label: "Аджика", priceDelta: 200 },
  { id: "recipe_tom_yam", label: "Том-ям", priceDelta: 200 },
  { id: "recipe_donskoy", label: "Донской", priceDelta: 0 },
  { id: "recipe_beer", label: "В пиве", priceDelta: 1000 },
  { id: "recipe_beer_hot", label: "В пиве острые", priceDelta: 1000 },
  { id: "recipe_apple_honey_fennel", label: "Яблоко на меду с фенхелем", priceDelta: 800 },
];

const friedRecipeOptions: ModifierOption[] = [
  { id: "fried_recipe_creamy_garlic", label: "Сливки-чеснок", priceDelta: 0 },
  { id: "fried_recipe_beer_spicy_herbs", label: "Пиво-травы острые", priceDelta: 0 },
  { id: "fried_recipe_white_truffle", label: "С белыми грибами и трюфелем", priceDelta: 0 },
  { id: "fried_recipe_asian_spicy", label: "Азиатский острый", priceDelta: 0 },
  { id: "fried_recipe_sour_dill_garlic", label: "Сметана-укроп-чеснок", priceDelta: 0 },
  { id: "fried_recipe_blue_cheese", label: "Блю чиз", priceDelta: 200 },
];

const liveSpicesOptions: ModifierOption[] = [
  { id: "live_spice_classic", label: "Классическая", priceDelta: 200 },
  { id: "live_spice_garlic", label: "Чесночная", priceDelta: 200 },
  { id: "live_spice_tomato", label: "Томатная", priceDelta: 200 },
  { id: "live_spice_hot", label: "Острая", priceDelta: 200 },
  { id: "live_spice_donskoy", label: "Донская", priceDelta: 500 },
];

const shrimpSauceOptions: ModifierOption[] = [
  { id: "shrimp_sauce_teriyaki", label: "Терияки", priceDelta: 180 },
  { id: "shrimp_sauce_cocktail", label: "Коктейльный", priceDelta: 160 },
  { id: "shrimp_sauce_aioli", label: "Айоли", priceDelta: 190 },
  { id: "shrimp_sauce_sweet_chili", label: "Свит чили", priceDelta: 180 },
];

const glovesAccessory: BundledAccessory = {
  id: "accessory_gloves",
  title: "Перчатки",
  perUnit: "kg",
  quantity: 1,
  note: "Одна пара на каждый килограмм раков.",
};

const breadToastAccessory: BundledAccessory = {
  id: "accessory_bread_toast",
  title: "Гренка пшеничная",
  perUnit: "kg",
  quantity: 1,
  note: "40 г на килограмм.",
};

const rakiSauceUpsells: UpsellAccessory[] = [
  { id: "sauce_tartar", title: "Соус тартар", price: 100 },
  { id: "sauce_cocktail", title: "Соус коктейльный", price: 100 },
  { id: "sauce_aioli", title: "Соус айоли", price: 100 },
  { id: "sauce_teriyaki", title: "Соус терияки", price: 100 },
];

const crabUpsells: UpsellAccessory[] = [
  { id: "accessory_scissors", title: "Ножницы для краба", price: 300 },
  { id: "sauce_teriyaki", title: "Соус терияки", price: 100 },
];

export const menuItems: MenuItem[] = [
  {
    id: "item_crayfish_boiled",
    category: "Варёные раки",
    categorySlug: "raki",
    subcategory: "boiled",
    productFamily: "boiled",
    name: "Варёные раки",
    description:
      "Главная линия The Raki: размер от S до XXL, реальный рецепт варки и вес подтверждаются ещё до корзины.",
    editorialNote:
      "Шеф варит раков 15 лет. Размерный ряд без компромиссов — S для плотных ужинов парой, XXL для стола на шесть.",
    basePrice: 4900,
    isSignature: true,
    availableFor: ["delivery", "pickup"],
    metadata: { origin: "Ростов-Дон", serving: "горячо к столу" },
    imageKey: "raki-boiled",
    bundledAccessories: [glovesAccessory],
    upsellAccessories: rakiSauceUpsells,
    note: "Минимальный заказ — 1 кг. Дальше вес добирается шагом 0.5 кг. Размерный ряд идёт через S-XXL, а старые граммы остаются только внутренним мостом.",
    bestEffortRequests: ["Только самки — только в сезон и без гарантии по конкретной партии."],
    commercialRules: {
      orderingModel: "weight_based",
      minimumWeightKg: 1,
      weightStepKg: 0.5,
      recipeAffectsPrice: true,
      seasonalRequest: crayfishSeasonalRule,
    },
    servicePointAvailability: [
      {
        servicePointId: "sp_lesnoy_pickup_01",
        state: "available",
        note: "Базовая линия активной кухни и самовывоза из Осоргино, 202.",
      },
    ],
    modifierGroups: [
        {
          id: "mg_boiled_size_tier",
          label: "Размер",
          kind: "core",
          minSelections: 1,
          maxSelections: 1,
          helpText: "Подберите размер под ваш стол и формат подачи.",
          options: boiledCrayfishSizeOptions,
        },
        {
          id: "mg_boiled_recipe",
          label: "Рецепт варки",
          kind: "core",
          minSelections: 1,
          maxSelections: 1,
          helpText: "Выберите рецепт, который лучше подходит к этой подаче.",
          options: boiledRecipeOptions,
        },
      {
        id: "mg_boiled_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Начинаем с 1 кг, дальше можно добавить по 0.5 кг.",
        options: crayfishWeightOptions,
      },
      {
        id: "mg_boiled_salt_balance",
        label: "Соль",
        kind: "secondary",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Небольшая настройка кухни под ваш вкус.",
        options: [
          { id: "salt_less", label: "Меньше соли", priceDelta: 0 },
          { id: "salt_classic", label: "Нормально соли", priceDelta: 0 },
          { id: "salt_more", label: "Больше соли", priceDelta: 0 },
        ],
      },
      {
        id: "mg_boiled_heat_level",
        label: "Острота",
        kind: "secondary",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Если нужно, кухня сделает подачу острее.",
        options: [
          { id: "heat_none", label: "Без добавочной остроты", priceDelta: 0 },
          { id: "heat_hot", label: "Поострее", priceDelta: 0 },
          { id: "heat_triple", label: "Тройная острота", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "item_crayfish_fried",
    category: "Жареные раки",
    categorySlug: "raki",
    subcategory: "fried",
    productFamily: "fried",
    name: "Жареные раки",
    description:
      "Жареная линия тоже строится вокруг размера и веса: тот же размерный ряд, но уже более плотная и насыщенная подача.",
    editorialNote:
      "Плотнее варёных, под сливки и травы. Хорошо идут поздним вечером, когда стол уже собран и нужен более сочный акцент.",
    basePrice: 5700,
    availableFor: ["delivery", "pickup"],
    metadata: { origin: "Ростов-Дон", serving: "горячо к столу" },
    imageKey: "raki-fried",
    bundledAccessories: [glovesAccessory],
    upsellAccessories: rakiSauceUpsells,
    note: "Минимальный заказ — 1 кг. Размер идёт от S до XXL. Жареная линия держится на размере, весе и сезонном пожелании без гарантии.",
    bestEffortRequests: ["Только самки — только в сезон и без гарантии по конкретной партии."],
    commercialRules: {
      orderingModel: "weight_based",
      minimumWeightKg: 1,
      weightStepKg: 0.5,
      recipeAffectsPrice: true,
      seasonalRequest: crayfishSeasonalRule,
    },
    servicePointAvailability: [
      {
        servicePointId: "sp_lesnoy_pickup_01",
        state: "available",
        note: "Жареные раки доступны для самовывоза с активной кухни из Осоргино, 202.",
      },
    ],
    modifierGroups: [
      {
        id: "mg_fried_size_tier",
        label: "Размер",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Размерный ряд должен совпадать с текущей шкалой: S, M, L, XL, XXL.",
        options: friedCrayfishSizeOptions,
      },
      {
        id: "mg_fried_recipe",
        label: "Рецепт обжарки",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Выберите рецепт. Сливки-чеснок — базовая подача.",
        options: friedRecipeOptions,
      },
      {
        id: "mg_fried_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Начинаем с 1 кг, дальше можно добавить по 0.5 кг.",
        options: crayfishWeightOptions,
      },
      {
        id: "mg_fried_heat_level",
        label: "Острота",
        kind: "secondary",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Дополнительную остроту фиксируем отдельно, если гость хочет жареную линию острее.",
        options: [
          { id: "fried_heat_regular", label: "Базовая", priceDelta: 0 },
          { id: "fried_heat_hot", label: "Острее", priceDelta: 0 },
          { id: "fried_heat_triple", label: "Тройная острота", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "item_crayfish_live",
    category: "Живые раки",
    categorySlug: "raki",
    subcategory: "live",
    productFamily: "live",
    name: "Живые раки",
    description:
      "Свежая линия для тех, кто хочет получить живого рака. Здесь главное — размерный ряд и вес, а не комментарии по рецепту.",
    editorialNote:
      "Прибывают живыми, хранятся в аквариуме до выезда. Специи кухня пришлёт отдельно — добавляются к заказу по запросу.",
    basePrice: 4700,
    availableFor: ["delivery", "pickup"],
    metadata: { origin: "Ростов-Дон", serving: "живые, в аквариуме" },
    imageKey: "raki-live",
    bundledAccessories: [glovesAccessory],
    note: "Минимальный заказ — 1 кг. Размерный ряд идёт от S до XXL. Самовывоз для живых раков пока ограничен.",
    bestEffortRequests: ["Только самки — только в сезон и без гарантии по текущей партии."],
    commercialRules: {
      orderingModel: "weight_based",
      minimumWeightKg: 1,
      weightStepKg: 0.5,
      recipeAffectsPrice: true,
      seasonalRequest: crayfishSeasonalRule,
    },
    servicePointAvailability: [
      {
        servicePointId: "sp_lesnoy_pickup_01",
        state: "hidden",
        note: "Живые раки пока не выводятся в самовывоз, чтобы не обещать лишнего по хранению и передаче.",
      },
    ],
    modifierGroups: [
      {
        id: "mg_live_size_tier",
        label: "Размер",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Размер и вес — главные параметры живой линии.",
        options: liveCrayfishSizeOptions,
      },
      {
        id: "mg_live_spice",
        label: "Специи",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Специи кухня шлёт отдельной упаковкой. Классическая — базовая подача.",
        options: liveSpicesOptions,
      },
      {
        id: "mg_live_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Начинаем с 1 кг, дальше можно добавить по 0.5 кг.",
        options: crayfishWeightOptions,
      },
    ],
  },
  {
    id: "item_shrimp_magadan_boiled",
    category: "Креветки Магаданские / Медведка",
    categorySlug: "shrimp",
    subcategory: "boiled",
    productFamily: "shrimp",
    name: "Магаданские креветки 70/90 отварные",
    description: "Магаданские креветки 70/90, отварные к подаче с лимоном и соусами на выбор.",
    editorialNote: "Дикие, не фермерские. Из открытого Охотского моря.",
    basePrice: 4400,
    availableFor: ["delivery", "pickup"],
    isSignature: true,
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Магадан", serving: "отварные" },
    imageKey: "shrimp-70-90-boiled",
    modifierGroups: [
      {
        id: "mg_shrimp_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_weight_1kg", label: "1 кг", priceDelta: 0 },
          { id: "shrimp_weight_2kg", label: "2 кг", priceDelta: 4400 },
        ],
      },
      {
        id: "mg_shrimp_sauce_boiled",
        label: "Соусы к подаче",
        kind: "secondary",
        minSelections: 0,
        maxSelections: 2,
        helpText: "По желанию можно добавить один или два соуса к подаче.",
        options: shrimpSauceOptions,
      },
    ],
  },
  {
    id: "item_shrimp_medvedka_ice",
    category: "Креветки Магаданские / Медведка",
    categorySlug: "shrimp",
    subcategory: "on-ice",
    productFamily: "shrimp",
    name: "Креветки - медведка 70/90 на льду",
    description: "Шипастая медведка на льду для холодной подачи и щедрого стола.",
    basePrice: 6000,
    availableFor: ["delivery", "pickup"],
    badge: "new",
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Магадан", serving: "на льду" },
    imageKey: "shrimp-medvedka",
    modifierGroups: [
      {
        id: "mg_shrimp_medvedka_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_medvedka_1kg", label: "1 кг", priceDelta: 0 },
          { id: "shrimp_medvedka_2kg", label: "2 кг", priceDelta: 6000 },
        ],
      },
      {
        id: "mg_shrimp_sauce_medvedka",
        label: "Соусы к подаче",
        kind: "secondary",
        minSelections: 0,
        maxSelections: 2,
        helpText: "По желанию можно добавить один или два соуса к подаче.",
        options: shrimpSauceOptions,
      },
    ],
  },
  {
    id: "item_shrimp_mix_on_ice",
    category: "Креветки Магаданские / Медведка",
    categorySlug: "shrimp",
    subcategory: "on-ice",
    productFamily: "shrimp",
    name: "MIX креветок на льду Магадан",
    description: "Смешанная ледяная подача с магаданской креветкой и медведкой.",
    basePrice: 6000,
    availableFor: ["delivery", "pickup"],
    badge: "new",
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Магадан", serving: "на льду" },
    imageKey: "shrimp-mix",
    modifierGroups: [
      {
        id: "mg_shrimp_mix_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_mix_1kg", label: "1 кг", priceDelta: 0 },
          { id: "shrimp_mix_2kg", label: "2 кг", priceDelta: 6000 },
        ],
      },
      {
        id: "mg_shrimp_sauce_mix",
        label: "Соусы к подаче",
        kind: "secondary",
        minSelections: 0,
        maxSelections: 2,
        helpText: "По желанию можно добавить один или два соуса к подаче.",
        options: shrimpSauceOptions,
      },
    ],
  },
  {
    id: "item_shrimp_magadan_fried",
    category: "Креветки Магаданские / Медведка",
    categorySlug: "shrimp",
    subcategory: "fried",
    productFamily: "shrimp",
    name: "Магаданские креветки обжаренные в азиатском стиле",
    description: "Магаданские креветки 70/90, обжаренные с чесноком, сливочным маслом и зеленью.",
    basePrice: 3900,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Магадан", serving: "обжаренные" },
    imageKey: "shrimp-70-90-fried",
    modifierGroups: [
      {
        id: "mg_shrimp_finish",
        label: "Формат",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_finish_classic", label: "Стандартная порция", priceDelta: 0 },
          { id: "shrimp_finish_large", label: "Усиленная порция", priceDelta: 1900 },
        ],
      },
      {
        id: "mg_shrimp_sauce_fried",
        label: "Соусы к подаче",
        kind: "secondary",
        minSelections: 0,
        maxSelections: 2,
        helpText: "По желанию можно добавить один или два соуса к подаче.",
        options: shrimpSauceOptions,
      },
    ],
  },
  {
    id: "item_shrimp_magadan_50_70_ice",
    category: "Креветки Магаданские / Медведка",
    categorySlug: "shrimp",
    subcategory: "on-ice",
    productFamily: "shrimp",
    name: "Магаданские креветки 50/70 на льду",
    description: "Более крупный калибр для холодной подачи и больших заказов.",
    basePrice: 4900,
    availableFor: ["delivery", "pickup"],
    badge: "new",
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Магадан", serving: "на льду" },
    imageKey: "shrimp-50-70-ice",
    modifierGroups: [
      {
        id: "mg_shrimp_50_70_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_50_70_1kg", label: "1 кг", priceDelta: 0 },
          { id: "shrimp_50_70_2kg", label: "2 кг", priceDelta: 4900 },
        ],
      },
      {
        id: "mg_shrimp_sauce_50_70",
        label: "Соусы к подаче",
        kind: "secondary",
        minSelections: 0,
        maxSelections: 2,
        helpText: "По желанию можно добавить один или два соуса к подаче.",
        options: shrimpSauceOptions,
      },
    ],
  },
  {
    id: "item_shrimp_magadan_boiled_sauce",
    category: "Креветки Магаданские / Медведка",
    categorySlug: "shrimp",
    subcategory: "boiled",
    productFamily: "shrimp",
    name: "Магаданские креветки 70/90 отварные с соусом",
    description: "Тот же калибр 70/90, но уже с базовым соусом в цене — подача для быстрого заказа.",
    basePrice: 3900,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Магадан", serving: "отварные с соусом" },
    imageKey: "shrimp-70-90-sauce",
    modifierGroups: [
      {
        id: "mg_shrimp_boiled_sauce_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_boiled_sauce_1kg", label: "1 кг", priceDelta: 0 },
          { id: "shrimp_boiled_sauce_2kg", label: "2 кг", priceDelta: 3900 },
        ],
      },
      {
        id: "mg_shrimp_boiled_sauce_kind",
        label: "Базовый соус",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Один соус включён в цену.",
        options: [
          { id: "shrimp_default_sauce_cocktail", label: "Коктейльный", priceDelta: 0 },
          { id: "shrimp_default_sauce_teriyaki", label: "Терияки", priceDelta: 0 },
          { id: "shrimp_default_sauce_aioli", label: "Айоли", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "item_shrimp_magadan_50_70_boiled",
    category: "Креветки Магаданские / Медведка",
    categorySlug: "shrimp",
    subcategory: "boiled",
    productFamily: "shrimp",
    name: "Магаданские креветки 50/70 отварные",
    description: "Крупный калибр отварных креветок для плотной подачи.",
    basePrice: 4500,
    availableFor: ["delivery", "pickup"],
    badge: "new",
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Магадан", serving: "отварные" },
    imageKey: "shrimp-50-70-boiled",
    modifierGroups: [
      {
        id: "mg_shrimp_50_70_boiled_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_50_70_boiled_1kg", label: "1 кг", priceDelta: 0 },
          { id: "shrimp_50_70_boiled_2kg", label: "2 кг", priceDelta: 4500 },
        ],
      },
      {
        id: "mg_shrimp_50_70_boiled_sauce",
        label: "Соусы к подаче",
        kind: "secondary",
        minSelections: 0,
        maxSelections: 2,
        helpText: "По желанию можно добавить один или два соуса.",
        options: shrimpSauceOptions,
      },
    ],
  },
  {
    id: "item_shrimp_tails_premium",
    category: "Раковые шейки",
    categorySlug: "shrimp-tails",
    productFamily: "shrimp-tails",
    name: "Раковые шейки премиум",
    description: "Очищенные раковые шейки для плотного закусочного стола.",
    editorialNote: "Ручная разделка. Отдаём охлаждёнными, без лишней заморозки.",
    basePrice: 2000,
    availableFor: ["delivery", "pickup"],
    isSignature: true,
    metadata: { weight: { value: 100, unit: "g" }, origin: "Ростов-Дон", serving: "очищенные" },
    imageKey: "shrimp-tails",
    modifierGroups: [
      {
        id: "mg_shrimp_tails_pack",
        label: "Порция",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "shrimp_tails_100g", label: "100 г", priceDelta: 0 },
          { id: "shrimp_tails_200g", label: "200 г", priceDelta: 2000 },
          { id: "shrimp_tails_500g", label: "500 г", priceDelta: 8000 },
        ],
      },
    ],
  },
  {
    id: "item_king_crab",
    category: "Камчатский краб",
    categorySlug: "crab",
    productFamily: "crab",
    name: "Фаланга камчатского краба L5",
    description: "Премиальная якорная линия из текущего меню, которая должна звучать спокойно и дорого.",
    editorialNote:
      "Самая крупная фаланга. Мяса до 90 процентов. Приходит живой, готовим под стол: в бульоне, на льду или живым.",
    basePrice: 10500,
    availableFor: ["delivery"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Камчатка", serving: "отварная" },
    imageKey: "crab-phalanx",
    upsellAccessories: crabUpsells,
    locationAvailability: [
      {
        locationId: "loc_lesnoy_01",
        state: "sold_out",
        note: "Текущая партия краба на активной кухне закончилась.",
      },
      {
        locationId: "loc_moscow_west_01",
        state: "planned",
        note: "Для западного кластера работа с крабом пока только запланирована.",
      },
      {
        locationId: "loc_moscow_center_01",
        state: "planned",
        note: "Для центра Москвы крабовая линия тоже пока только в плане.",
      },
    ],
    modifierGroups: [
      {
        id: "mg_crab_finish",
        label: "Подача",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Отварная в бульоне, охлаждённая на льду или живая — выбор за столом.",
        options: [
          { id: "crab_broth", label: "В бульоне", priceDelta: 0 },
          { id: "crab_cold", label: "На льду", priceDelta: 0 },
          { id: "crab_live", label: "Живым", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "item_king_crab_whole",
    category: "Камчатский краб",
    categorySlug: "crab",
    productFamily: "crab",
    name: "Камчатский краб целиком 2 кг",
    description: "Большая якорная позиция для тех, кто приходит в The Raki за редким и дорогим продуктом.",
    editorialNote: "Для стола на шестерых и больше. Подача — целиком: в бульоне, на льду или живым.",
    basePrice: 16000,
    availableFor: ["delivery"],
    badge: "hit",
    metadata: { weight: { value: 2, unit: "kg" }, origin: "Камчатка", serving: "целиком" },
    imageKey: "crab-whole",
    upsellAccessories: [crabUpsells[0]],
    servicePointAvailability: [
      {
        servicePointId: "sp_lesnoy_dispatch_01",
        state: "available",
        note: "Целый краб доступен к доставке с активной кухни — подтверждается звонком.",
      },
    ],
    modifierGroups: [
      {
        id: "mg_crab_whole_finish",
        label: "Подача",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        helpText: "Отварная в бульоне, охлаждённая на льду или живая — выбор за столом.",
        options: [
          { id: "crab_whole_broth", label: "В бульоне", priceDelta: 0 },
          { id: "crab_whole_cold", label: "На льду", priceDelta: 0 },
          { id: "crab_whole_live", label: "Живым", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "item_mussels_blue_cheese",
    category: "Мидии",
    categorySlug: "mussels",
    productFamily: "mussels",
    name: "Мидии в соусе Блю Чиз / 1 кг",
    description: "Реальная соседняя линия меню, которая показывает ресторанную ширину каталога рядом с главной раковой линией.",
    basePrice: 3000,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Мурманск", serving: "горячо" },
    imageKey: "mussels-blue-cheese",
    bundledAccessories: [breadToastAccessory],
    modifierGroups: [
      {
        id: "mg_mussels_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "mussels_one_kg", label: "1 кг", priceDelta: 0 },
          { id: "mussels_two_kg", label: "2 кг", priceDelta: 3000 },
        ],
      },
    ],
  },
  {
    id: "item_mussels_tomato_greens",
    category: "Мидии",
    categorySlug: "mussels",
    productFamily: "mussels",
    name: "Мидии в соусе Томат — Зелень / 1 кг",
    description: "Более яркая томатная линия для гостей, которым нужна тёплая гастрономическая подача.",
    basePrice: 3000,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Мурманск", serving: "горячо" },
    imageKey: "mussels-tomato-greens",
    bundledAccessories: [breadToastAccessory],
    modifierGroups: [
      {
        id: "mg_mussels_tomato_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "mussels_tomato_1kg", label: "1 кг", priceDelta: 0 },
          { id: "mussels_tomato_2kg", label: "2 кг", priceDelta: 3000 },
        ],
      },
    ],
  },
  {
    id: "item_mussels_pesto",
    category: "Мидии",
    categorySlug: "mussels",
    productFamily: "mussels",
    name: "Мидии в соусе Песто / 1 кг",
    description: "Зелёная линия мидий для тех, кто ищет более мягкую и свежую подачу.",
    basePrice: 3000,
    availableFor: ["delivery", "pickup"],
    isSignature: true,
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Мурманск", serving: "горячо" },
    imageKey: "mussels-pesto",
    bundledAccessories: [breadToastAccessory],
    modifierGroups: [
      {
        id: "mg_mussels_pesto_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "mussels_pesto_1kg", label: "1 кг", priceDelta: 0 },
          { id: "mussels_pesto_2kg", label: "2 кг", priceDelta: 3000 },
        ],
      },
    ],
  },
  {
    id: "item_mussels_tom_yam",
    category: "Мидии",
    categorySlug: "mussels",
    productFamily: "mussels",
    name: "Мидии в соусе Том Ям / 1 кг",
    description: "Острый вариант мидий для тех, кто хочет более яркую и пряную подачу.",
    basePrice: 3000,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Мурманск", serving: "остро, горячо" },
    imageKey: "mussels-tom-yam",
    bundledAccessories: [breadToastAccessory],
    modifierGroups: [
      {
        id: "mg_mussels_tom_yam_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "mussels_ty_one_kg", label: "1 кг", priceDelta: 0 },
          { id: "mussels_ty_two_kg", label: "2 кг", priceDelta: 3000 },
        ],
      },
    ],
  },
  {
    id: "item_vongole_arabiata",
    category: "Вонголе",
    categorySlug: "vongole",
    productFamily: "mussels",
    name: "Вонголе в соусе Арабьята / 1 кг",
    description: "Лёгкая и более средиземноморская ветка внутри мидийной линии.",
    basePrice: 2400,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Средиземноморье", serving: "остро, горячо" },
    imageKey: "vongole-arrabiata",
    bundledAccessories: [breadToastAccessory],
    modifierGroups: [
      {
        id: "mg_vongole_arabiata_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "vongole_arabiata_1kg", label: "1 кг", priceDelta: 0 },
          { id: "vongole_arabiata_2kg", label: "2 кг", priceDelta: 2400 },
        ],
      },
    ],
  },
  {
    id: "item_vongole_creamy",
    category: "Вонголе",
    categorySlug: "vongole",
    productFamily: "mussels",
    name: "Вонголе в сливочно-сырном соусе / 1 кг",
    description: "Более мягкая кремовая линия для спокойного ресторанного заказа.",
    basePrice: 2400,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Средиземноморье", serving: "горячо" },
    imageKey: "vongole-creamy",
    bundledAccessories: [breadToastAccessory],
    modifierGroups: [
      {
        id: "mg_vongole_creamy_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "vongole_creamy_1kg", label: "1 кг", priceDelta: 0 },
          { id: "vongole_creamy_2kg", label: "2 кг", priceDelta: 2400 },
        ],
      },
    ],
  },
  {
    id: "item_vongole_pesto",
    category: "Вонголе",
    categorySlug: "vongole",
    productFamily: "mussels",
    name: "Вонголе в соусе Песто / 1 кг",
    description: "Свежая зелёная ветка внутри мидийной карты для более лёгкой подачи.",
    basePrice: 2400,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 1, unit: "kg" }, origin: "Средиземноморье", serving: "горячо" },
    imageKey: "vongole-pesto",
    bundledAccessories: [breadToastAccessory],
    modifierGroups: [
      {
        id: "mg_vongole_pesto_weight",
        label: "Вес",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "vongole_pesto_1kg", label: "1 кг", priceDelta: 0 },
          { id: "vongole_pesto_2kg", label: "2 кг", priceDelta: 2400 },
        ],
      },
    ],
  },
  {
    id: "item_caviar_red",
    category: "Икра",
    categorySlug: "caviar",
    productFamily: "caviar",
    name: "Икра красная Горбуши / 250 гр",
    description: "Красная икра как деликатесная линия рядом с крабом и раками.",
    basePrice: 3500,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 250, unit: "g" }, origin: "Сахалин", serving: "охлаждённая" },
    imageKey: "caviar-red",
    modifierGroups: [
      {
        id: "mg_caviar_pack",
        label: "Формат",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "caviar_pack_250", label: "250 гр", priceDelta: 0 },
          { id: "caviar_pack_500", label: "500 гр", priceDelta: 3500 },
        ],
      },
    ],
  },
  {
    id: "item_caviar_black",
    category: "Икра",
    categorySlug: "caviar",
    productFamily: "caviar",
    name: "Икра черная 250 зернистая русского осетра пластик",
    description: "Тихая чёрная линия для дорогого деликатесного заказа.",
    basePrice: 15000,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 250, unit: "g" }, origin: "Русский осётр", serving: "охлаждённая" },
    imageKey: "caviar-black",
    modifierGroups: [
      {
        id: "mg_black_caviar_pack",
        label: "Формат",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "black_caviar_250", label: "250 гр", priceDelta: 0 },
          { id: "black_caviar_500", label: "500 гр", priceDelta: 15000 },
        ],
      },
    ],
  },
  {
    id: "item_dessert_cherry",
    category: "Десерты",
    categorySlug: "desserts",
    productFamily: "dessert",
    name: "Вишня в молочном шоколаде",
    description: "Небольшой сладкий финал, который не спорит с главным продуктом.",
    basePrice: 1500,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 130, unit: "g" }, serving: "комнатная" },
    imageKey: "dessert-cherry",
    modifierGroups: [
      {
        id: "mg_dessert_cherry_pack",
        label: "Формат",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "dessert_cherry_130", label: "130 гр", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "item_dessert_raspberry",
    category: "Десерты",
    categorySlug: "desserts",
    productFamily: "dessert",
    name: "Малина в молочном шоколаде",
    description: "Сладкая линия для тех, кто хочет закончить заказ мягко и аккуратно.",
    basePrice: 1500,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 130, unit: "g" }, serving: "комнатная" },
    imageKey: "dessert-raspberry",
    modifierGroups: [
      {
        id: "mg_dessert_raspberry_pack",
        label: "Формат",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "dessert_raspberry_130", label: "130 гр", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "item_drink_borjomi",
    category: "Напитки",
    categorySlug: "drinks",
    subcategory: "non-alcoholic",
    productFamily: "drink",
    name: "Боржоми",
    description: "Спокойное сопровождение к заказу без лишнего внимания к себе.",
    basePrice: 250,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 500, unit: "g" }, origin: "Грузия", serving: "охлаждённая" },
    imageKey: "drink-borjomi",
    modifierGroups: [
      {
        id: "mg_drink_volume",
        label: "Формат",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "borjomi_05", label: "0.5 л", priceDelta: 0 },
          { id: "borjomi_pack", label: "Упаковка из 6", priceDelta: 1250 },
        ],
      },
    ],
  },
  {
    id: "item_drink_yoga_cherry",
    category: "Напитки",
    categorySlug: "drinks",
    subcategory: "non-alcoholic",
    productFamily: "drink",
    name: "Сок YOGA Вишня 0,2",
    description: "Спокойное сопровождение для заказа, которое не спорит за внимание с главным продуктом.",
    basePrice: 490,
    availableFor: ["delivery", "pickup"],
    metadata: { weight: { value: 200, unit: "g" }, origin: "Италия", serving: "охлаждённый" },
    imageKey: "drink-yoga-cherry",
    modifierGroups: [
      {
        id: "mg_yoga_volume",
        label: "Формат",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "yoga_02", label: "0,2 л", priceDelta: 0 },
          { id: "yoga_pack", label: "Упаковка из 6", priceDelta: 2450 },
        ],
      },
    ],
  },
  {
    id: "item_gift_card",
    category: "Подарки",
    categorySlug: "gifts",
    productFamily: "gift",
    name: "Подарочная карта",
    description: "Подарочная линия, которая остаётся в витрине как жест и повод, не смещая фокус с главного заказа.",
    editorialNote: "На любую сумму от 3 000 ₽. Вручается в конверте при доставке.",
    basePrice: 5000,
    availableFor: ["delivery"],
    imageKey: "gift-card",
    modifierGroups: [
      {
        id: "mg_gift_value",
        label: "Номинал",
        kind: "core",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "value_5k", label: "5 000 ₽", priceDelta: 0 },
          { id: "value_10k", label: "10 000 ₽", priceDelta: 5000 },
          { id: "value_25k", label: "25 000 ₽", priceDelta: 20000 },
        ],
      },
    ],
  },
];

export const cartScenarios = {
  ready: {
    subtotal: 6700,
    fee: 500,
    minimumOrderAmount: 5000,
    summary: "Cart is valid for current zone and ready to move into checkout.",
  },
  "below-minimum": {
    subtotal: 3200,
    fee: 500,
    minimumOrderAmount: 5000,
    summary: "Good test for early rule visibility instead of surprise at payment step.",
  },
  invalidated: {
    subtotal: 6700,
    fee: 0,
    minimumOrderAmount: 5000,
    summary: "Product or context changed. Guest must recover before checkout.",
  },
} satisfies Record<CartState, { subtotal: number; fee: number; minimumOrderAmount: number; summary: string }>;

export const errorTaxonomy = [
  "OutOfZone",
  "LocationClosed",
  "MenuItemUnavailable",
  "BelowMinimum",
  "PaymentFailed",
  "PosTimeout",
  "Unknown",
] as const;

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}

export function formatWeightKg(amount: number) {
  const normalized = Number.isInteger(amount)
    ? amount.toString()
    : amount.toFixed(1).replace(".", ",");
  return `${normalized} кг`;
}

export function getProductCommercialTruth(item: MenuItem, referenceDate = new Date()) {
  const rules = item.commercialRules;
  const seasonalRequest = rules?.seasonalRequest ?? null;
  const currentMonth = referenceDate.getMonth() + 1;
  const seasonalActive = seasonalRequest
    ? seasonalRequest.activeMonths.includes(currentMonth)
    : null;

  const truthChips: string[] = [];
  const truthLines: string[] = [];

  if (["boiled", "fried", "live"].includes(item.productFamily)) {
    truthChips.push("размеры S-XXL");
    truthLines.push("Размерный ряд идёт по текущей шкале: от S до XXL.");
  }

  if (rules?.minimumWeightKg) {
    truthChips.push(`от ${formatWeightKg(rules.minimumWeightKg)}`);
    truthLines.push(`Минимальный заказ — ${formatWeightKg(rules.minimumWeightKg)}.`);
  }

  if (rules?.weightStepKg) {
    truthChips.push(`шаг ${formatWeightKg(rules.weightStepKg)}`);
    truthLines.push(`Дальше вес добирается шагом ${formatWeightKg(rules.weightStepKg)}.`);
  }

  if (rules?.recipeAffectsPrice) {
    truthChips.push("рецепт меняет цену");
    truthLines.push("Выбранный рецепт влияет на цену строки заказа.");
  }

  if (seasonalRequest) {
    truthChips.push(
      seasonalActive ? `${seasonalRequest.label}: сезон активен` : `${seasonalRequest.label}: вне сезона`,
    );
      truthLines.push(
        seasonalActive
          ? `${seasonalRequest.label} сейчас допустимы только как пожелание без гарантии в сезон ${seasonalRequest.seasonLabel}.`
          : `${seasonalRequest.label} сейчас вне сезона ${seasonalRequest.seasonLabel} и не должны звучать как рабочее обещание.`,
      );
  }

  return {
    orderingModel: rules?.orderingModel ?? ("standard" as ProductOrderingModel),
    isWeightBased: rules?.orderingModel === "weight_based",
    minimumWeightKg: rules?.minimumWeightKg ?? null,
    weightStepKg: rules?.weightStepKg ?? null,
    recipeAffectsPrice: Boolean(rules?.recipeAffectsPrice),
    seasonalRequestLabel: seasonalRequest?.label ?? null,
    seasonalSeasonLabel: seasonalRequest?.seasonLabel ?? null,
    seasonalActive,
    seasonalNote: seasonalRequest?.note ?? null,
    truthChips,
    truthLines,
  };
}

const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));
const legalEntitiesById = new Map(legalEntities.map((entity) => [entity.id, entity]));
const locationsById = new Map(locations.map((location) => [location.id, location]));
const servicePointsById = new Map(servicePoints.map((point) => [point.id, point]));
const zonesById = new Map(zones.map((zone) => [zone.id, zone]));

export function getMenuItem(productId: string) {
  return menuItemsById.get(productId);
}

export function getLegalEntity(legalEntityId: string | null) {
  if (!legalEntityId) return undefined;
  return legalEntitiesById.get(legalEntityId);
}

export function getLocation(locationId: string | null) {
  if (!locationId) return undefined;
  return locationsById.get(locationId);
}

export function getServicePoint(servicePointId: string | null) {
  if (!servicePointId) return undefined;
  return servicePointsById.get(servicePointId);
}

export function getZone(zoneId: string | null) {
  if (!zoneId) return undefined;
  return zonesById.get(zoneId);
}

function compareClockLabels(left: string, right: string) {
  return left.localeCompare(right);
}

const timingSlotsById = new Map(timingSlots.map((slot) => [slot.id, slot]));

export function getTimingSlot(slotId: string | null | undefined) {
  if (!slotId) return undefined;
  return timingSlotsById.get(slotId);
}

export function getTimingSlotPromiseLabel(slot: TimingSlot | null | undefined) {
  if (!slot) {
    return null;
  }

  if (slot.fulfillmentMode === "delivery") {
    return `${slot.label} (допуск ±15 минут)`;
  }

  return slot.label;
}

export function getTimingSlotsForContext(input: {
  fulfillmentMode: FulfillmentMode | null;
  deliveryState?: DeliveryState | null;
  pickupState?: PickupState | null;
  zoneId?: string | null;
  locationId?: string | null;
  servicePointId?: string | null;
}) {
  if (input.fulfillmentMode === "delivery") {
    if (!input.zoneId || input.deliveryState === "out-of-zone") {
      return [] as TimingSlot[];
    }

    const scopedSlots = timingSlots
      .filter(
        (slot) =>
          slot.fulfillmentMode === "delivery" &&
          slot.zoneId === input.zoneId,
      )
      .sort((left, right) =>
        left.dayOffset === right.dayOffset
          ? compareClockLabels(left.targetTime, right.targetTime)
          : left.dayOffset - right.dayOffset,
      );

    if (input.deliveryState === "cutoff") {
      return scopedSlots.filter((slot) => slot.dayOffset > 0);
    }

    return scopedSlots;
  }

  if (input.fulfillmentMode === "pickup") {
    if (!input.servicePointId && !input.locationId) {
      return [] as TimingSlot[];
    }

    const scopedSlots = timingSlots
      .filter(
        (slot) =>
          slot.fulfillmentMode === "pickup" &&
          (input.servicePointId
            ? slot.servicePointId === input.servicePointId
            : slot.locationId === input.locationId),
      )
      .sort((left, right) =>
        left.dayOffset === right.dayOffset
          ? compareClockLabels(left.targetTime, right.targetTime)
          : left.dayOffset - right.dayOffset,
      );

    if (input.pickupState === "closed") {
      return scopedSlots.filter((slot) => slot.dayOffset > 0);
    }

    return scopedSlots;
  }

  return [] as TimingSlot[];
}

export function getDefaultTimingSlotForContext(input: {
  fulfillmentMode: FulfillmentMode | null;
  deliveryState?: DeliveryState | null;
  pickupState?: PickupState | null;
  zoneId?: string | null;
  locationId?: string | null;
  servicePointId?: string | null;
}) {
  return getTimingSlotsForContext(input)[0] ?? null;
}

function resolveAvailabilityState(
  input: {
    state: MenuAvailabilityState | undefined;
    fallbackReason: string;
    explicitReason?: string;
    basePrice: number;
    priceDelta?: number;
  },
) {
  const priceDelta = input.priceDelta ?? 0;
  const effectiveBasePrice = input.basePrice + priceDelta;

  if (input.state === "hidden") {
    return {
      state: "hidden" as MenuAvailabilityState,
      reason: input.explicitReason ?? "Эта позиция сейчас не активна для текущей точки.",
      effectiveBasePrice,
      priceDelta,
    };
  }

  if (input.state === "planned") {
    return {
      state: "planned" as MenuAvailabilityState,
      reason: input.explicitReason ?? "Эта позиция запланирована для точки, но ещё не активна.",
      effectiveBasePrice,
      priceDelta,
    };
  }

  if (input.state === "sold_out") {
    return {
      state: "sold_out" as MenuAvailabilityState,
      reason: input.explicitReason ?? "Эта позиция временно закончилась на назначенной точке.",
      effectiveBasePrice,
      priceDelta,
    };
  }

  return {
    state: "available" as MenuAvailabilityState,
    reason: input.explicitReason ?? input.fallbackReason,
    effectiveBasePrice,
    priceDelta,
  };
}

export function getMenuItemSnapshotForContext(input: {
  item: MenuItem;
  fulfillmentMode: FulfillmentMode;
  locationId?: string | null;
  servicePointId?: string | null;
}) {
  if (!input.item.availableFor.includes(input.fulfillmentMode)) {
    return {
      item: input.item,
      state: "hidden" as MenuAvailabilityState,
      reason:
        input.fulfillmentMode === "pickup"
          ? "Эта позиция сейчас не предлагается для самовывоза."
          : "Эта позиция сейчас не предлагается для доставки.",
      effectiveBasePrice: input.item.basePrice,
      priceDelta: 0,
    };
  }

  if (input.servicePointId && input.item.servicePointAvailability?.length) {
    const servicePointMatch = input.item.servicePointAvailability.find(
      (entry) => entry.servicePointId === input.servicePointId,
    );

    if (servicePointMatch) {
      return {
        item: input.item,
        ...resolveAvailabilityState({
          state: servicePointMatch.state,
          fallbackReason: "Позиция активна для текущей сервисной точки.",
          explicitReason: servicePointMatch.note,
          basePrice: input.item.basePrice,
          priceDelta: servicePointMatch.priceDelta,
        }),
      };
    }
  }

  if (input.locationId && input.item.locationAvailability?.length) {
    const locationMatch = input.item.locationAvailability.find(
      (entry) => entry.locationId === input.locationId,
    );

    if (locationMatch) {
      return {
        item: input.item,
        ...resolveAvailabilityState({
          state: locationMatch.state,
          fallbackReason: "Позиция активна для текущего снимка кухни.",
          explicitReason: locationMatch.note,
          basePrice: input.item.basePrice,
          priceDelta: locationMatch.priceDelta,
        }),
      };
    }
  }

  return {
    item: input.item,
    state: "available" as MenuAvailabilityState,
    reason:
      input.fulfillmentMode === "pickup"
        ? "Позиция доступна для текущего самовывоза."
        : "Позиция доступна для текущей доставки.",
    effectiveBasePrice: input.item.basePrice,
    priceDelta: 0,
  };
}

export function getMenuSnapshotForContext(input: {
  fulfillmentMode: FulfillmentMode;
  locationId?: string | null;
  servicePointId?: string | null;
}) {
  const evaluatedItems = menuItems.map((item) =>
    getMenuItemSnapshotForContext({
      item,
      fulfillmentMode: input.fulfillmentMode,
      locationId: input.locationId,
      servicePointId: input.servicePointId,
    }),
  );

  return {
    visibleItems: evaluatedItems.filter((entry) => entry.state === "available"),
    soldOutItems: evaluatedItems.filter((entry) => entry.state === "sold_out"),
    hiddenItems: evaluatedItems.filter(
      (entry) => entry.state === "hidden" || entry.state === "planned",
    ),
    unavailableItems: evaluatedItems.filter((entry) => entry.state !== "available"),
    evaluatedItems,
  };
}

export function getDraftLineRevalidationIssues(input: {
  lineItems: DraftLineItem[];
  fulfillmentMode: FulfillmentMode | null;
  locationId?: string | null;
  servicePointId?: string | null;
}) {
  const fulfillmentMode = input.fulfillmentMode;

  if (!fulfillmentMode) {
    return [] as DraftLineRevalidationIssue[];
  }

  return input.lineItems
    .map((lineItem, lineIndex) => {
      const item = getMenuItem(lineItem.itemId);

      if (!item) {
        return {
          type: "item_unavailable" as DraftLineRevalidationIssueType,
          lineIndex,
          itemId: lineItem.itemId,
          itemName: lineItem.itemName,
          snapshotState: "hidden" as MenuAvailabilityState,
          reason: "This item no longer exists in the active catalog snapshot.",
          previousBasePrice: lineItem.basePrice,
          currentBasePrice: lineItem.basePrice,
        };
      }

      const snapshot = getMenuItemSnapshotForContext({
        item,
        fulfillmentMode,
        locationId: input.locationId,
        servicePointId: input.servicePointId,
      });

      if (snapshot.state !== "available") {
        return {
          type: "item_unavailable" as DraftLineRevalidationIssueType,
          lineIndex,
          itemId: lineItem.itemId,
          itemName: lineItem.itemName,
          snapshotState: snapshot.state,
          reason: snapshot.reason,
          previousBasePrice: lineItem.basePrice,
          currentBasePrice: snapshot.effectiveBasePrice,
        };
      }

      if (lineItem.basePrice !== snapshot.effectiveBasePrice) {
        return {
          type: "point_price_changed" as DraftLineRevalidationIssueType,
          lineIndex,
          itemId: lineItem.itemId,
          itemName: lineItem.itemName,
          snapshotState: snapshot.state,
          reason: snapshot.reason,
          previousBasePrice: lineItem.basePrice,
          currentBasePrice: snapshot.effectiveBasePrice,
        };
      }

      return null;
    })
    .filter((issue): issue is DraftLineRevalidationIssue => Boolean(issue));
}

function containsAddressKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function inferRoutingCluster(input: {
  zoneId?: string | null;
  typedAddress?: string | null;
  normalizedAddress?: string | null;
}) {
  const addressText = `${input.typedAddress ?? ""} ${input.normalizedAddress ?? ""}`.toLowerCase();

  if (
    input.zoneId === "zone_rublevka" ||
    containsAddressKeyword(addressText, ["barvikha", "rublev", "кутуз", "kutuz"])
  ) {
    return "west_moscow" as RoutingCluster;
  }

  if (
    input.zoneId === "zone_center_msk" ||
    containsAddressKeyword(addressText, [
      "tversk",
      "тверск",
      "akhmat",
      "ахмат",
      "center",
      "центр",
      "москва",
      "moscow",
      "patriarch",
    ])
  ) {
    return "center_moscow" as RoutingCluster;
  }

  return "unassigned" as RoutingCluster;
}

function buildRoutingResolverNote(input: {
  cluster?: RoutingCluster;
  fulfillmentMode?: FulfillmentMode | null;
  deliveryState?: DeliveryState | null;
  fulfillmentSource?: DeliveryFulfillmentSource | null;
  vipOverride?: boolean;
  sensitiveRoute?: boolean;
}) {
  if (input.fulfillmentMode === "pickup") {
    return "Самовывоз сейчас резолвится в активную точку Осоргино, 202. В будущем новые кухни смогут добавлять свои pickup-узлы без изменения storefront-контракта.";
  }

  if (input.deliveryState === "out-of-zone") {
    return "Если адрес вне текущего покрытия, назначение точки вообще не создаётся.";
  }

  const clusterBase =
    input.cluster === "west_moscow"
      ? "Сейчас западные маршруты ещё резолвятся в Осоргино, 202. После запуска западного кластера он должен стать основной точкой."
      : input.cluster === "center_moscow"
        ? "Сейчас маршруты по центру Москвы ещё резолвятся в Осоргино, 202. После запуска центральной точки она должна стать основной."
        : "Пока более сильного multi-point правила нет, маршрут остаётся на текущей активной кухне.";

  const stressSuffix =
    input.fulfillmentSource === "overflow_provider"
      ? " Courier overflow still pushes final handoff into manual review."
      : input.vipOverride
        ? " VIP handling should later support protected routing rules across multiple points."
        : input.sensitiveRoute
          ? " Sensitive handoff rules should later be point-specific, not only zone-specific."
          : input.deliveryState === "cutoff"
            ? " The route can resolve to a dispatch point even when the timing window forces scheduling or manual confirmation."
            : "";

  return `${clusterBase}${stressSuffix}`;
}

export function evaluateRoutingAssignment(input: {
  fulfillmentMode?: FulfillmentMode | null;
  deliveryState?: DeliveryState | null;
  zoneId?: string | null;
  typedAddress?: string | null;
  normalizedAddress?: string | null;
  fulfillmentSource?: DeliveryFulfillmentSource | null;
  vipOverride?: boolean;
  sensitiveRoute?: boolean;
}): RoutingEvaluation {
  if (input.fulfillmentMode === "pickup") {
    return {
      cluster: "pickup_core",
      ruleKey: "pickup_current_core",
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_pickup_01",
      legalEntityId: "le_raki_core",
      futureLocationId: null,
      futureServicePointId: null,
      futureLegalEntityId: null,
      resolverNote: buildRoutingResolverNote(input),
    };
  }

  if (input.deliveryState === "out-of-zone") {
    return {
      cluster: "unassigned",
      ruleKey: "out_of_zone_unassigned",
      locationId: null,
      servicePointId: null,
      legalEntityId: null,
      futureLocationId: null,
      futureServicePointId: null,
      futureLegalEntityId: null,
      resolverNote: buildRoutingResolverNote(input),
    };
  }

  const cluster = inferRoutingCluster(input);

  if (cluster === "west_moscow") {
    return {
      cluster,
      ruleKey: "west_cluster_current_core_future_west",
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      futureLocationId: "loc_moscow_west_01",
      futureServicePointId: "sp_moscow_west_dispatch_01",
      futureLegalEntityId: "le_raki_future_west",
      resolverNote: buildRoutingResolverNote({ ...input, cluster }),
    };
  }

  if (cluster === "center_moscow") {
    return {
      cluster,
      ruleKey: "center_cluster_current_core_future_center",
      locationId: "loc_lesnoy_01",
      servicePointId: "sp_lesnoy_dispatch_01",
      legalEntityId: "le_raki_core",
      futureLocationId: "loc_moscow_center_01",
      futureServicePointId: "sp_moscow_center_dispatch_01",
      futureLegalEntityId: "le_raki_future_center",
      resolverNote: buildRoutingResolverNote({ ...input, cluster }),
    };
  }

  return {
    cluster: "unassigned",
    ruleKey: "fallback_current_core",
    locationId: "loc_lesnoy_01",
    servicePointId: "sp_lesnoy_dispatch_01",
    legalEntityId: "le_raki_core",
    futureLocationId: null,
    futureServicePointId: null,
    futureLegalEntityId: null,
    resolverNote: buildRoutingResolverNote({ ...input, cluster }),
  };
}

export function getNetworkEntityStatusLabel(status: NetworkEntityStatus | null | undefined) {
  if (status === "active") return "Активно";
  if (status === "planned") return "Запланировано";
  return "Не назначено";
}

export function getRoutingAssignmentDisplay(input: {
  locationId: string | null;
  servicePointId: string | null;
  legalEntityId: string | null;
  futureLocationId?: string | null;
  futureServicePointId?: string | null;
  futureLegalEntityId?: string | null;
  ruleKey?: RoutingRuleKey | null;
  cluster?: RoutingCluster | null;
}) {
  const location = getLocation(input.locationId);
  const servicePoint = getServicePoint(input.servicePointId);
  const legalEntity = getLegalEntity(input.legalEntityId);
  const futureLocation = getLocation(input.futureLocationId ?? null);
  const futureServicePoint = getServicePoint(input.futureServicePointId ?? null);
  const futureLegalEntity = getLegalEntity(input.futureLegalEntityId ?? null);

  return {
    locationLabel: location?.name ?? "Ещё не назначена",
    locationRegionLabel: location?.regionLabel ?? "Регион маршрута ещё не определён",
    locationStatusLabel: getNetworkEntityStatusLabel(location?.status),
    servicePointLabel: servicePoint?.label ?? "Ещё не назначена",
    servicePointStatusLabel: getNetworkEntityStatusLabel(servicePoint?.status),
    legalEntityLabel: legalEntity?.label ?? "Ещё не назначено",
    legalEntityStatusLabel: getNetworkEntityStatusLabel(legalEntity?.status),
    futureLocationLabel: futureLocation?.name ?? "Будущая точка пока не выбрана",
    futureLocationStatusLabel: getNetworkEntityStatusLabel(futureLocation?.status),
    futureServicePointLabel: futureServicePoint?.label ?? "Будущая точка исполнения пока не выбрана",
    futureServicePointStatusLabel: getNetworkEntityStatusLabel(futureServicePoint?.status),
    futureLegalEntityLabel: futureLegalEntity?.label ?? "Будущее юрлицо пока не выбрано",
    futureLegalEntityStatusLabel: getNetworkEntityStatusLabel(futureLegalEntity?.status),
    ruleKey: input.ruleKey ?? "fallback_current_core",
    clusterLabel:
      input.cluster === "center_moscow"
        ? "Центральный кластер Москвы"
        : input.cluster === "west_moscow"
          ? "Западный кластер Москвы"
          : input.cluster === "pickup_core"
            ? "Базовый pickup-контур"
            : "Кластер не определён",
  };
}

const deliveryScenariosById = new Map(
  deliveryScenarios.map((scenario) => [scenario.id, scenario]),
);

export function getDeliveryScenario(scenarioId: string | null | undefined) {
  if (!scenarioId) return undefined;
  return deliveryScenariosById.get(scenarioId);
}

export function findDeliveryScenarioForDraftContext(input: {
  serviceLabel?: string | null;
  typedAddress?: string | null;
  normalizedAddress?: string | null;
}) {
  const byServiceLabel =
    input.serviceLabel
      ? deliveryScenarios.find((scenario) => scenario.label === input.serviceLabel)
      : undefined;

  if (byServiceLabel) {
    return byServiceLabel;
  }

  const byTypedAddress =
    input.typedAddress
      ? deliveryScenarios.find((scenario) => scenario.typedAddress === input.typedAddress)
      : undefined;

  if (byTypedAddress) {
    return byTypedAddress;
  }

  return input.normalizedAddress
    ? deliveryScenarios.find((scenario) => scenario.normalizedAddress === input.normalizedAddress)
    : undefined;
}

export function getDropoffCorrectionOptions(scenarioId: string | null | undefined) {
  const scenario = getDeliveryScenario(scenarioId);

  if (!scenario || !scenario.normalizedAddress || !scenario.confirmedDropoffLabel) {
    return [] as DropoffCorrectionOption[];
  }

  const baseOption: DropoffCorrectionOption = {
    id: "keep_current_confirmed_dropoff",
    label: "Оставить текущую подтверждённую точку",
    note: "Оставляем текущую точку вручения и возвращаем маршрут в ручную проверку без новой коррекции.",
    normalizedAddress: scenario.normalizedAddress,
    confirmedDropoffLabel: scenario.confirmedDropoffLabel,
    confirmedDropoffSource: scenario.confirmedDropoffSource ?? "suggestion",
    confirmedDropoffLat: scenario.confirmedDropoffLat ?? 0,
    confirmedDropoffLng: scenario.confirmedDropoffLng ?? 0,
    addressConfidence: scenario.addressConfidence ?? "medium",
    courierInstructions: scenario.courierInstructions,
    etaAdjustmentMinutes: 0,
  };

  return [baseOption, ...(scenarioCorrectionOverrides[scenario.id] ?? [])];
}

export function getDeliveryScenarioEtaLabel(scenario: DeliveryScenario) {
  return scenario.etaLabelOverride ?? getZone(scenario.zoneId)?.etaLabel ?? null;
}

const featuredDeliveryScenarioIds = [
  "delivery_tverskaya_7",
  "delivery_barvikha",
  "delivery_quote_pending",
  "delivery_eta_stretched",
] as const;

function normalizeAddressSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, "е");
}

function buildDeliveryScenarioSearchText(scenario: DeliveryScenario) {
  return normalizeAddressSearchValue(
    [
      scenario.label,
      scenario.typedAddress,
      scenario.normalizedAddress ?? "",
      scenario.confirmedDropoffLabel ?? "",
      scenario.note,
    ].join(" "),
  );
}

function getFeaturedScenarioRank(scenarioId: string) {
  const index = featuredDeliveryScenarioIds.indexOf(
    scenarioId as (typeof featuredDeliveryScenarioIds)[number],
  );
  return index === -1 ? 99 : index;
}

export function getDeliveryAddressSuggestions(query: string) {
  const normalizedQuery = normalizeAddressSearchValue(query);
  const normalizedTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const ranked = deliveryScenarios
    .map((scenario) => {
      const searchableText = buildDeliveryScenarioSearchText(scenario);
      const featuredRank = getFeaturedScenarioRank(scenario.id);
      let score = featuredRank === 99 ? 0 : 100 - featuredRank * 10;

      if (!normalizedQuery) {
        return {
          scenario,
          score,
        };
      }

      if (normalizeAddressSearchValue(scenario.typedAddress).startsWith(normalizedQuery)) {
        score += 80;
      }

      if (normalizeAddressSearchValue(scenario.label).startsWith(normalizedQuery)) {
        score += 70;
      }

      if (searchableText.includes(normalizedQuery)) {
        score += 50;
      }

      score += normalizedTokens.reduce(
        (sum, token) => (searchableText.includes(token) ? sum + 12 : sum),
        0,
      );

      return {
        scenario,
        score,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  return ranked
    .slice(0, normalizedQuery ? 6 : 4)
    .map(({ scenario }) => scenario);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(input: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(input.toLat - input.fromLat);
  const dLng = toRadians(input.toLng - input.fromLng);
  const lat1 = toRadians(input.fromLat);
  const lat2 = toRadians(input.toLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5;
}

function getEtaSwing(totalMinutes: number) {
  if (totalMinutes >= 140) return 20;
  if (totalMinutes >= 95) return 15;
  return 10;
}

export function getDynamicDeliveryEtaLabel(input: {
  locationId: string | null;
  zoneId: string | null;
  deliveryState?: DeliveryState | null;
  destinationLat: number | null;
  destinationLng: number | null;
  fallbackEtaLabel?: string | null;
  fulfillmentSource?: DeliveryFulfillmentSource | null;
  addressConfidence?: AddressConfidence | null;
  vipOverride?: boolean;
  sensitiveRoute?: boolean;
  etaAdjustmentMinutes?: number;
}) {
  if (input.deliveryState === "out-of-zone") {
    return null;
  }

  const location = getLocation(input.locationId);

  if (!location || input.destinationLat === null || input.destinationLng === null) {
    return input.fallbackEtaLabel ?? null;
  }

  const distanceKm = getDistanceKm({
    fromLat: location.lat,
    fromLng: location.lng,
    toLat: input.destinationLat,
    toLng: input.destinationLng,
  });

  const prepBaseMinutes = 40;
  const driveMinutes = distanceKm * 1.35;
  const zoneBufferMinutes =
    input.zoneId === "zone_rublevka" ? 34 : input.zoneId === "zone_center_msk" ? 18 : 24;
  const overflowBufferMinutes = input.fulfillmentSource === "overflow_provider" ? 12 : 0;
  const sensitivityBufferMinutes =
    input.vipOverride || input.sensitiveRoute ? 8 : 0;
  const confidenceBufferMinutes =
    input.addressConfidence === "low" ? 10 : input.addressConfidence === "medium" ? 5 : 0;

  const totalMinutes = roundToNearestFive(
    prepBaseMinutes +
      driveMinutes +
      zoneBufferMinutes +
      overflowBufferMinutes +
      sensitivityBufferMinutes +
      confidenceBufferMinutes +
      (input.etaAdjustmentMinutes ?? 0),
  );
  const swing = getEtaSwing(totalMinutes);

  return `${Math.max(50, totalMinutes - swing)}-${totalMinutes + swing} мин`;
}

export function getAddressConfidenceLabel(confidence: AddressConfidence | null) {
  if (confidence === "high") return "Высокая";
  if (confidence === "medium") return "Средняя";
  if (confidence === "low") return "Низкая";
  return "Не подтверждена";
}

export function getDeliveryDropoffSourceLabel(source: DeliveryDropoffSource | null) {
  if (source === "suggestion") return "По адресу";
  if (source === "map_pin") return "На карте";
  if (source === "operator_override") return "Через команду";
  return "Уточняем";
}

export function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function pickValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
