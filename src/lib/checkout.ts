import type { OrderDraftContext } from "@/lib/draft";

export type CheckoutIssue = {
  field: string;
  message: string;
};

export function isValidRuPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return /^7\d{10}$/.test(cleaned);
}

export function normalizeRuPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("8") && cleaned.length === 11) {
    return "7" + cleaned.slice(1);
  }
  if (cleaned.startsWith("7") && cleaned.length === 11) {
    return cleaned;
  }
  return cleaned;
}

export function getCheckoutIssues(draft: OrderDraftContext): CheckoutIssue[] {
  const issues: CheckoutIssue[] = [];

  if (!draft.customerPhone || !isValidRuPhone(draft.customerPhone)) {
    issues.push({ field: "phone", message: "Укажите номер телефона" });
  }

  if (!draft.customerName.trim()) {
    issues.push({ field: "name", message: "Укажите имя" });
  }

  if (draft.lineItems.length === 0) {
    issues.push({ field: "cart", message: "Корзина пуста" });
  }

  if (!draft.fulfillmentMode) {
    issues.push({ field: "fulfillment", message: "Выберите способ получения" });
  }

  // Delivery-specific gating: a delivery order needs a resolved geo point
  // before submit. The address flow is supposed to fill these, but users can
  // arrive at checkout with a partial draft (back-button navigation, cleared
  // localStorage fields, edge-case quote failures). Catch it here so the
  // operator doesn't receive "Точка на карте" with null coordinates.
  if (draft.fulfillmentMode === "delivery") {
    if (
      draft.confirmedDropoffLat === null ||
      draft.confirmedDropoffLng === null
    ) {
      issues.push({
        field: "delivery_coordinates",
        message: "Адрес доставки не подтверждён — вернитесь на шаг адреса",
      });
    } else if (!draft.normalizedAddress.trim()) {
      issues.push({
        field: "delivery_address",
        message: "Адрес доставки не подтверждён — вернитесь на шаг адреса",
      });
    }
  }

  return issues;
}
