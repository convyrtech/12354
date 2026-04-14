import type { OrderDraftContext } from "@/lib/draft";
import type { DraftLineItem } from "@/lib/line-item";
import {
  findDeliveryScenarioForDraftContext,
  formatMoney,
  getDeliveryScenarioEtaLabel,
  getDraftLineRevalidationIssues,
  getDynamicDeliveryEtaLabel,
  getZone,
} from "@/lib/fixtures";

export type DraftCartView = {
  items: DraftLineItem[];
  lineItems: DraftLineItem[];
  lineCount: number;
  subtotal: number;
  subtotalLabel: string;
  fee: number;
  total: number;
  totalLabel: string;
  state: OrderDraftContext["cartState"];
  itemLabel: string | null;
  serviceLabel: string | null;
  serviceTimingLabel: string | null;
  etaLabel: string | null;
  revalidationIssues: ReturnType<typeof getDraftLineRevalidationIssues>;
  itemCount: number;
};

export function getDraftCartView(draft: OrderDraftContext): DraftCartView {
  const subtotal = draft.lineItems.reduce((sum, lineItem) => sum + lineItem.totalPrice, 0);
  const lineCount = draft.lineItems.length;
  const fee =
    draft.fulfillmentMode === "delivery"
      ? (draft.liveDeliveryQuoteAmount ?? getZone(draft.zoneId)?.feeAmount ?? 0)
      : 0;
  const total = subtotal + fee;
  const deliveryScenario =
    draft.fulfillmentMode === "delivery"
      ? findDeliveryScenarioForDraftContext({
          serviceLabel: draft.serviceLabel,
          typedAddress: draft.typedAddress,
          normalizedAddress: draft.normalizedAddress,
        })
      : null;
  const fallbackEtaLabel = deliveryScenario
    ? getDeliveryScenarioEtaLabel(deliveryScenario)
    : getZone(draft.zoneId)?.etaLabel ?? null;
  const etaLabel =
    draft.fulfillmentMode === "delivery"
      ? getDynamicDeliveryEtaLabel({
          locationId: draft.locationId,
          zoneId: draft.zoneId,
          deliveryState: draft.deliveryState,
          destinationLat: draft.confirmedDropoffLat,
          destinationLng: draft.confirmedDropoffLng,
          fallbackEtaLabel,
          fulfillmentSource: draft.deliveryFulfillmentSource,
          addressConfidence: draft.addressConfidence,
          vipOverride: draft.deliveryVipOverride,
          sensitiveRoute: draft.deliverySensitiveRoute,
        })
      : null;
  const itemLabel =
    lineCount === 0
      ? null
      : lineCount === 1
        ? (draft.lineItems[0]?.itemName ?? null)
        : `${draft.lineItems[0]?.itemName ?? "Заказ"} +${lineCount - 1}`;

  return {
    items: draft.lineItems,
    lineItems: draft.lineItems,
    lineCount,
    subtotal,
    subtotalLabel: formatMoney(subtotal),
    fee,
    total,
    totalLabel: formatMoney(total),
    state: draft.cartState,
    itemLabel,
    serviceLabel: draft.serviceLabel || draft.confirmedDropoffLabel || draft.typedAddress || null,
    serviceTimingLabel: draft.serviceTimingLabel || null,
    etaLabel,
    revalidationIssues: getDraftLineRevalidationIssues({
      lineItems: draft.lineItems,
      fulfillmentMode: draft.fulfillmentMode,
      locationId: draft.locationId,
      servicePointId: draft.servicePointId,
    }),
    itemCount: lineCount,
  };
}

export function getCartStateLabel(state: string, lineCount = 0): string {
  if (lineCount === 0) return "Пустая корзина";

  switch (state) {
    case "ready":
      return "Готова к оформлению";
    case "below-minimum":
      return "Ниже минимальной суммы заказа";
    case "invalidated":
      return "Требует пересмотра";
    default:
      return state;
  }
}

export function getTimingIntentLabel(intent: string | null): string {
  switch (intent) {
    case "asap":
      return "Как можно скорее";
    case "scheduled":
      return "Ко времени";
    default:
      return "Не выбрано";
  }
}

export function getFulfillmentLabel(mode: string | null): string {
  switch (mode) {
    case "delivery":
      return "Доставка";
    case "pickup":
      return "Самовывоз";
    default:
      return "Не выбрано";
  }
}

export function getDraftTtlLabel(input: OrderDraftContext | string): string {
  const expiresAt = new Date(typeof input === "string" ? input : input.expiresAt);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) return "Истек";

  const minutes = Math.ceil(diffMs / 60000);
  return `${minutes} мин`;
}

export function hasResolvedServiceContext(draft: OrderDraftContext): boolean {
  if (draft.fulfillmentMode === "delivery") {
    return draft.deliveryState === "in-zone" && draft.zoneId !== null && draft.locationId !== null;
  }

  if (draft.fulfillmentMode === "pickup") {
    return draft.pickupState === "ready" && draft.servicePointId !== null;
  }

  return false;
}
