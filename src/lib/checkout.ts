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

  return issues;
}
