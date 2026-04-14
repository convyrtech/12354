import type {
  AddressConfidence,
  CartState,
  DeliveryState,
  DeliveryDropoffSource,
  FulfillmentMode,
  PaymentMethod,
  PickupState,
  TimingIntent,
} from "@/lib/fixtures";
import type { DeliveryDecisionState, DeliveryFulfillmentSource } from "@/lib/delivery-policy";
import {
  getDeliveryScenario,
  getDeliveryScenarioEtaLabel,
  getDraftLineRevalidationIssues,
  getDynamicDeliveryEtaLabel,
  getMenuItem,
  getZone,
} from "@/lib/fixtures";
import { buildDefaultDraftLineItem, type DraftLineItem } from "@/lib/line-item";

export type OrderStage =
  | "idle"
  | "context"
  | "menu"
  | "product"
  | "cart"
  | "checkout"
  | "manual_confirmation"
  | "operator_review"
  | "address_correction"
  | "payment_pending"
  | "payment_failed"
  | "recovery"
  | "pending_ack"
  | "accepted";

export type OperatorResolution =
  | "accepted_current_source"
  | "accepted_overflow"
  | "guest_callback_required";

export type OrderDraftContext = {
  sessionId: string;
  contextVersion: number;
  expiresAt: string;
  fulfillmentMode: FulfillmentMode | null;
  deliveryState: DeliveryState | null;
  pickupState: PickupState | null;
  zoneId: string | null;
  locationId: string | null;
  servicePointId: string | null;
  legalEntityId: string | null;
  resolverNote: string;
  serviceLabel: string;
  serviceTimingLabel: string;
  typedAddress: string;
  normalizedAddress: string;
  confirmedDropoffLabel: string;
  confirmedDropoffSource: DeliveryDropoffSource | null;
  confirmedDropoffLat: number | null;
  confirmedDropoffLng: number | null;
  addressConfidence: AddressConfidence | null;
  courierInstructions: string;
  deliveryFulfillmentSource: DeliveryFulfillmentSource | null;
  deliveryVipOverride: boolean;
  deliverySensitiveRoute: boolean;
  deliveryDecisionState: DeliveryDecisionState | null;
  deliveryDecisionNote: string;
  liveDeliveryQuoteAmount: number | null;
  timingIntent: TimingIntent | null;
  requestedTimeSlotId: string | null;
  requestedTimeLabel: string;
  cartState: CartState;
  lineItems: DraftLineItem[];
  paymentMethod: PaymentMethod | null;
  orderStage: OrderStage;
  customerName: string;
  customerPhone: string;
  customerComment: string;
  operatorResolution: OperatorResolution | null;
  operatorDecisionSummary: string;
  idempotencyKey: string;
  updatedAt: string;
};

export type DraftPatch = Partial<OrderDraftContext>;

const TWENTY_MINUTES = 20 * 60 * 1000;
const BOOTSTRAP_UPDATED_AT = "2026-03-20T00:00:00.000Z";
const BOOTSTRAP_EXPIRES_AT = "2026-03-20T00:20:00.000Z";

function nowIso() {
  return new Date().toISOString();
}

function getLineItemsSubtotal(lineItems: DraftLineItem[]) {
  return lineItems.reduce((sum, lineItem) => sum + lineItem.totalPrice, 0);
}

function getResolvedCartState(
  draft: Pick<
    OrderDraftContext,
    "cartState" | "fulfillmentMode" | "lineItems" | "zoneId" | "locationId" | "servicePointId"
  >,
) {
  if (draft.lineItems.length === 0) {
    return "ready" as CartState;
  }

  if (draft.cartState === "invalidated") {
    return "invalidated" as CartState;
  }

  if (draft.fulfillmentMode === "delivery") {
    const minimumOrderAmount = getZone(draft.zoneId)?.minimumOrderAmount ?? 0;

    if (minimumOrderAmount > 0 && getLineItemsSubtotal(draft.lineItems) < minimumOrderAmount) {
      return "below-minimum" as CartState;
    }
  }

  if (
    getDraftLineRevalidationIssues({
      lineItems: draft.lineItems,
      fulfillmentMode: draft.fulfillmentMode,
      locationId: draft.locationId,
      servicePointId: draft.servicePointId,
    }).length > 0
  ) {
    return "invalidated" as CartState;
  }

  return "ready" as CartState;
}

function createToken(prefix: string) {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${raw}`;
}

const cartStates = ["ready", "below-minimum", "invalidated"] as const;
const deliveryStates = ["in-zone", "out-of-zone", "cutoff"] as const;
const pickupStates = ["ready", "closed", "delay"] as const;
const paymentMethods = ["cash_on_receipt", "online_card", "sbp"] as const;
const timingIntents = ["asap", "scheduled"] as const;
const addressConfidences = ["high", "medium", "low"] as const;
const dropoffSources = ["suggestion", "map_pin", "operator_override"] as const;
const deliverySources = ["own_courier", "overflow_provider"] as const;
const deliveryDecisionStates = ["self_serve", "manual_confirmation"] as const;
const operatorResolutions = [
  "accepted_current_source",
  "accepted_overflow",
  "guest_callback_required",
] as const;
const orderStages = [
  "idle",
  "context",
  "menu",
  "product",
  "cart",
  "checkout",
  "manual_confirmation",
  "operator_review",
  "address_correction",
  "payment_pending",
  "payment_failed",
  "recovery",
  "pending_ack",
  "accepted",
] as const;

function pickAllowed<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function pickNullableAllowed<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T | null,
) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function asOptionalString(value: unknown, fallback: string | null) {
  return typeof value === "string" ? value : fallback;
}

function normalizeLineItem(value: unknown): DraftLineItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.itemId !== "string" ||
    typeof record.itemName !== "string" ||
    typeof record.basePrice !== "number" ||
    typeof record.unitPrice !== "number" ||
    typeof record.totalPrice !== "number"
  ) {
    return null;
  }

  return {
    itemId: record.itemId,
    itemName: record.itemName,
    quantity: typeof record.quantity === "number" && record.quantity > 0 ? record.quantity : 1,
    basePrice: record.basePrice,
    unitPrice: record.unitPrice,
    totalPrice: record.totalPrice,
    selections: Array.isArray(record.selections)
      ? record.selections
          .map((selection) => {
            if (!selection || typeof selection !== "object") {
              return null;
            }

            const selectionRecord = selection as Record<string, unknown>;

            if (
              typeof selectionRecord.groupId !== "string" ||
              !Array.isArray(selectionRecord.optionIds)
            ) {
              return null;
            }

            return {
              groupId: selectionRecord.groupId,
              optionIds: selectionRecord.optionIds.filter(
                (optionId): optionId is string => typeof optionId === "string",
              ),
            };
          })
          .filter((selection): selection is DraftLineItem["selections"][number] => Boolean(selection))
      : [],
    summaryLines: Array.isArray(record.summaryLines)
      ? record.summaryLines.filter((line): line is string => typeof line === "string")
      : [],
  };
}

export function hydrateStoredDraft(raw: unknown): OrderDraftContext {
  const fallback = createDraft();

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const legacyLineItem = normalizeLineItem(record.selectedLineItem);
  const legacySelectedItemId = typeof record.selectedItemId === "string" ? record.selectedItemId : null;
  const lineItems =
    Array.isArray(record.lineItems)
      ? record.lineItems
          .map((lineItem) => normalizeLineItem(lineItem))
          .filter((lineItem): lineItem is DraftLineItem => Boolean(lineItem))
      : legacyLineItem
        ? [legacyLineItem]
        : legacySelectedItemId
          ? (() => {
              const item = getMenuItem(legacySelectedItemId);
              return item ? [buildDefaultDraftLineItem(item)] : [];
            })()
          : [];

  const hydratedDraft: OrderDraftContext = {
    ...fallback,
    sessionId: typeof record.sessionId === "string" ? record.sessionId : fallback.sessionId,
    contextVersion:
      typeof record.contextVersion === "number" && record.contextVersion > 0
        ? record.contextVersion
        : fallback.contextVersion,
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : fallback.expiresAt,
    fulfillmentMode:
      record.fulfillmentMode === null
        ? null
        : pickNullableAllowed(record.fulfillmentMode, ["delivery", "pickup"] as const, fallback.fulfillmentMode),
    deliveryState:
      record.deliveryState === null
        ? null
        : pickNullableAllowed(record.deliveryState, deliveryStates, fallback.deliveryState),
    pickupState:
      record.pickupState === null
        ? null
        : pickNullableAllowed(record.pickupState, pickupStates, fallback.pickupState),
    zoneId: record.zoneId === null ? null : asOptionalString(record.zoneId, fallback.zoneId),
    locationId:
      record.locationId === null ? null : asOptionalString(record.locationId, fallback.locationId),
    servicePointId:
      record.servicePointId === null
        ? null
        : asOptionalString(record.servicePointId, fallback.servicePointId),
    legalEntityId:
      record.legalEntityId === null
        ? null
        : asOptionalString(record.legalEntityId, fallback.legalEntityId),
    resolverNote: typeof record.resolverNote === "string" ? record.resolverNote : fallback.resolverNote,
    serviceLabel: typeof record.serviceLabel === "string" ? record.serviceLabel : fallback.serviceLabel,
    serviceTimingLabel:
      typeof record.serviceTimingLabel === "string"
        ? record.serviceTimingLabel
        : fallback.serviceTimingLabel,
    typedAddress: typeof record.typedAddress === "string" ? record.typedAddress : fallback.typedAddress,
    normalizedAddress:
      typeof record.normalizedAddress === "string"
        ? record.normalizedAddress
        : fallback.normalizedAddress,
    confirmedDropoffLabel:
      typeof record.confirmedDropoffLabel === "string"
        ? record.confirmedDropoffLabel
        : fallback.confirmedDropoffLabel,
    confirmedDropoffSource:
      record.confirmedDropoffSource === null
        ? null
        : pickNullableAllowed(record.confirmedDropoffSource, dropoffSources, fallback.confirmedDropoffSource),
    confirmedDropoffLat:
      typeof record.confirmedDropoffLat === "number"
        ? record.confirmedDropoffLat
        : fallback.confirmedDropoffLat,
    confirmedDropoffLng:
      typeof record.confirmedDropoffLng === "number"
        ? record.confirmedDropoffLng
        : fallback.confirmedDropoffLng,
    addressConfidence:
      record.addressConfidence === null
        ? null
        : pickNullableAllowed(record.addressConfidence, addressConfidences, fallback.addressConfidence),
    courierInstructions:
      typeof record.courierInstructions === "string"
        ? record.courierInstructions
        : fallback.courierInstructions,
    deliveryFulfillmentSource:
      record.deliveryFulfillmentSource === null
        ? null
        : pickNullableAllowed(
            record.deliveryFulfillmentSource,
            deliverySources,
            fallback.deliveryFulfillmentSource,
          ),
    deliveryVipOverride:
      typeof record.deliveryVipOverride === "boolean"
        ? record.deliveryVipOverride
        : fallback.deliveryVipOverride,
    deliverySensitiveRoute:
      typeof record.deliverySensitiveRoute === "boolean"
        ? record.deliverySensitiveRoute
        : fallback.deliverySensitiveRoute,
    deliveryDecisionState:
      record.deliveryDecisionState === null
        ? null
        : pickNullableAllowed(
            record.deliveryDecisionState,
            deliveryDecisionStates,
            fallback.deliveryDecisionState,
          ),
    deliveryDecisionNote:
      typeof record.deliveryDecisionNote === "string"
        ? record.deliveryDecisionNote
        : fallback.deliveryDecisionNote,
    liveDeliveryQuoteAmount:
      typeof record.liveDeliveryQuoteAmount === "number"
        ? record.liveDeliveryQuoteAmount
        : fallback.liveDeliveryQuoteAmount,
    timingIntent:
      record.timingIntent === null
        ? null
        : pickNullableAllowed(record.timingIntent, timingIntents, fallback.timingIntent),
    requestedTimeSlotId:
      record.requestedTimeSlotId === null
        ? null
        : asOptionalString(record.requestedTimeSlotId, fallback.requestedTimeSlotId),
    requestedTimeLabel:
      typeof record.requestedTimeLabel === "string"
        ? record.requestedTimeLabel
        : fallback.requestedTimeLabel,
    cartState: pickAllowed(record.cartState, cartStates, fallback.cartState),
    lineItems,
    paymentMethod:
      record.paymentMethod === null
        ? null
        : pickNullableAllowed(record.paymentMethod, paymentMethods, fallback.paymentMethod),
    orderStage: pickAllowed(record.orderStage, orderStages, fallback.orderStage),
    customerName: typeof record.customerName === "string" ? record.customerName : fallback.customerName,
    customerPhone: typeof record.customerPhone === "string" ? record.customerPhone : fallback.customerPhone,
    customerComment:
      typeof record.customerComment === "string" ? record.customerComment : fallback.customerComment,
    operatorResolution:
      record.operatorResolution === null
        ? null
        : pickNullableAllowed(
            record.operatorResolution,
            operatorResolutions,
            fallback.operatorResolution,
          ),
    operatorDecisionSummary:
      typeof record.operatorDecisionSummary === "string"
        ? record.operatorDecisionSummary
        : fallback.operatorDecisionSummary,
    idempotencyKey:
      typeof record.idempotencyKey === "string" ? record.idempotencyKey : fallback.idempotencyKey,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : fallback.updatedAt,
  };

  return {
    ...hydratedDraft,
    cartState: getResolvedCartState(hydratedDraft),
  };
}

export function createBootstrapDraft(overrides: DraftPatch = {}): OrderDraftContext {
  return {
    sessionId: "draft_bootstrap",
    contextVersion: 1,
    expiresAt: BOOTSTRAP_EXPIRES_AT,
    fulfillmentMode: null,
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
    cartState: "ready",
    lineItems: [],
    paymentMethod: null,
    orderStage: "idle",
    customerName: "",
    customerPhone: "",
    customerComment: "",
    operatorResolution: null,
    operatorDecisionSummary: "",
    idempotencyKey: "pay_bootstrap",
    updatedAt: BOOTSTRAP_UPDATED_AT,
    ...overrides,
  };
}

export function createDraft(overrides: DraftPatch = {}): OrderDraftContext {
  const updatedAt = nowIso();

  return {
    sessionId: createToken("draft"),
    contextVersion: 1,
    expiresAt: new Date(Date.now() + TWENTY_MINUTES).toISOString(),
    fulfillmentMode: null,
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
    cartState: "ready",
    lineItems: [],
    paymentMethod: null,
    orderStage: "idle",
    customerName: "",
    customerPhone: "",
    customerComment: "",
    operatorResolution: null,
    operatorDecisionSummary: "",
    idempotencyKey: createToken("pay"),
    updatedAt,
    ...overrides,
  };
}

export function createInvestorDemoDraft(overrides: DraftPatch = {}): OrderDraftContext {
  const scenario = getDeliveryScenario("delivery_tverskaya_7");
  const boiled = getMenuItem("item_crayfish_boiled");
  const shrimp = getMenuItem("item_shrimp_magadan_boiled");
  const lineItems = [boiled, shrimp]
    .filter((item): item is NonNullable<typeof boiled> => Boolean(item))
    .map((item) => buildDefaultDraftLineItem(item));
  const etaLabel =
    (scenario
      ? getDynamicDeliveryEtaLabel({
          locationId: scenario.assignment?.locationId ?? "loc_lesnoy_01",
          zoneId: scenario.zoneId,
          deliveryState: scenario.state,
          destinationLat: scenario.confirmedDropoffLat,
          destinationLng: scenario.confirmedDropoffLng,
          fallbackEtaLabel: getDeliveryScenarioEtaLabel(scenario),
          fulfillmentSource: scenario.fulfillmentSource,
          addressConfidence: scenario.addressConfidence,
        })
      : null) ??
    (scenario ? getDeliveryScenarioEtaLabel(scenario) : null) ??
    "90-120 мин";

  return createDraft({
    fulfillmentMode: "delivery",
    deliveryState: scenario?.state ?? "in-zone",
    pickupState: null,
    zoneId: scenario?.zoneId ?? "zone_center_msk",
    locationId: scenario?.assignment?.locationId ?? "loc_lesnoy_01",
    servicePointId: scenario?.assignment?.servicePointId ?? "sp_lesnoy_dispatch_01",
    legalEntityId: scenario?.assignment?.legalEntityId ?? "le_raki_core",
    resolverNote: scenario?.assignment?.resolverNote ?? "",
    serviceLabel: scenario?.label ?? "Тверская, 7",
    serviceTimingLabel: etaLabel,
    typedAddress: scenario?.typedAddress ?? "Тверская, 7",
    normalizedAddress: scenario?.normalizedAddress ?? "Тверская улица, 7, Москва",
    confirmedDropoffLabel:
      scenario?.confirmedDropoffLabel ?? "Центральный вход, Тверская, 7",
    confirmedDropoffSource: scenario?.confirmedDropoffSource ?? "suggestion",
    confirmedDropoffLat: scenario?.confirmedDropoffLat ?? 55.7584,
    confirmedDropoffLng: scenario?.confirmedDropoffLng ?? 37.6132,
    addressConfidence: scenario?.addressConfidence ?? "high",
    courierInstructions:
      scenario?.courierInstructions ?? "Позвонить за 15 минут до передачи заказа.",
    deliveryFulfillmentSource: scenario?.fulfillmentSource ?? "own_courier",
    deliveryVipOverride: Boolean(scenario?.vipOverride),
    deliverySensitiveRoute: Boolean(scenario?.sensitiveRoute),
    deliveryDecisionState: "self_serve",
    deliveryDecisionNote: "",
    liveDeliveryQuoteAmount: scenario?.liveQuoteAmount ?? 500,
    timingIntent: "asap",
    requestedTimeSlotId: null,
    requestedTimeLabel: "Как можно раньше",
    cartState: "ready",
    lineItems,
    paymentMethod: "cash_on_receipt",
    orderStage: "cart",
    customerName: "Александр",
    customerPhone: "+7 999 000-00-00",
    customerComment: "Позвонить за 15 минут до передачи заказа.",
    operatorResolution: null,
    operatorDecisionSummary: "",
    ...overrides,
  });
}

export function isBootstrapDraft(draft: OrderDraftContext) {
  return draft.sessionId === "draft_bootstrap";
}

export function applyDraftPatch(
  current: OrderDraftContext,
  patch: DraftPatch,
): OrderDraftContext {
  const next: OrderDraftContext = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
    expiresAt: new Date(Date.now() + TWENTY_MINUTES).toISOString(),
  };

  const contextTouched =
    patch.fulfillmentMode !== undefined ||
    patch.deliveryState !== undefined ||
    patch.pickupState !== undefined ||
    patch.zoneId !== undefined ||
    patch.locationId !== undefined ||
    patch.servicePointId !== undefined ||
    patch.legalEntityId !== undefined ||
    patch.typedAddress !== undefined ||
    patch.normalizedAddress !== undefined ||
    patch.confirmedDropoffLabel !== undefined ||
    patch.confirmedDropoffSource !== undefined ||
    patch.confirmedDropoffLat !== undefined ||
    patch.confirmedDropoffLng !== undefined ||
    patch.addressConfidence !== undefined;

  if (contextTouched) {
    const contextMeaningfullyChanged =
      (patch.fulfillmentMode !== undefined &&
        patch.fulfillmentMode !== current.fulfillmentMode) ||
      (patch.deliveryState !== undefined &&
        patch.deliveryState !== current.deliveryState) ||
      (patch.pickupState !== undefined &&
        patch.pickupState !== current.pickupState) ||
      (patch.zoneId !== undefined && patch.zoneId !== current.zoneId) ||
      (patch.locationId !== undefined && patch.locationId !== current.locationId) ||
      (patch.servicePointId !== undefined &&
        patch.servicePointId !== current.servicePointId) ||
      (patch.legalEntityId !== undefined &&
        patch.legalEntityId !== current.legalEntityId) ||
      (patch.typedAddress !== undefined && patch.typedAddress !== current.typedAddress) ||
      (patch.normalizedAddress !== undefined &&
        patch.normalizedAddress !== current.normalizedAddress) ||
      (patch.confirmedDropoffLabel !== undefined &&
        patch.confirmedDropoffLabel !== current.confirmedDropoffLabel) ||
      (patch.confirmedDropoffSource !== undefined &&
        patch.confirmedDropoffSource !== current.confirmedDropoffSource) ||
      (patch.confirmedDropoffLat !== undefined &&
        patch.confirmedDropoffLat !== current.confirmedDropoffLat) ||
      (patch.confirmedDropoffLng !== undefined &&
        patch.confirmedDropoffLng !== current.confirmedDropoffLng) ||
      (patch.addressConfidence !== undefined &&
        patch.addressConfidence !== current.addressConfidence);

    if (contextMeaningfullyChanged) {
      next.contextVersion = current.contextVersion + 1;

      if (patch.deliveryFulfillmentSource === undefined) {
        next.deliveryFulfillmentSource = null;
      }

      if (patch.locationId === undefined) {
        next.locationId = null;
      }

      if (patch.servicePointId === undefined) {
        next.servicePointId = null;
      }

      if (patch.legalEntityId === undefined) {
        next.legalEntityId = null;
      }

      if (patch.resolverNote === undefined) {
        next.resolverNote = "";
      }

      if (patch.deliveryVipOverride === undefined) {
        next.deliveryVipOverride = false;
      }

      if (patch.deliverySensitiveRoute === undefined) {
        next.deliverySensitiveRoute = false;
      }

      if (patch.deliveryDecisionState === undefined) {
        next.deliveryDecisionState = null;
      }

      if (patch.deliveryDecisionNote === undefined) {
        next.deliveryDecisionNote = "";
      }

      if (patch.liveDeliveryQuoteAmount === undefined) {
        next.liveDeliveryQuoteAmount = null;
      }

      if (patch.requestedTimeSlotId === undefined) {
        next.requestedTimeSlotId = null;
      }

      if (patch.requestedTimeLabel === undefined && next.timingIntent === "scheduled") {
        next.requestedTimeLabel = "";
      }

      if (patch.operatorResolution === undefined) {
        next.operatorResolution = null;
      }

      if (patch.operatorDecisionSummary === undefined) {
        next.operatorDecisionSummary = "";
      }

      if (current.lineItems.length > 0) {
        next.cartState = "invalidated";
      }
    }
  }

  if (patch.paymentMethod !== undefined && patch.paymentMethod !== current.paymentMethod) {
    next.idempotencyKey = createToken("pay");
  }

  next.cartState = getResolvedCartState(next);

  return next;
}
