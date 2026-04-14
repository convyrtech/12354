import type { OrderDraftContext } from "@/lib/draft";
import type { PaymentMethod } from "@/lib/fixtures";

export type OrderSubmissionChannel = "local_queue" | "iiko";
export type OrderSubmissionStatus = "accepted" | "submitted" | "sync_failed";

export type SubmitOrderRequest = {
  draft: OrderDraftContext;
};

export type SubmittedOrderSummary = {
  reference: string;
  createdAt: string;
  total: number;
  totalLabel: string;
  lineCount: number;
  guestLabel: string;
  fulfillmentLabel: string;
  serviceLabel: string;
  handoffLabel: string;
  handoffStatus: OrderSubmissionStatus;
  externalReference: string | null;
  trackingHref: string | null;
  opsHref: string;
};

export type SubmitOrderResponse = {
  order: SubmittedOrderSummary;
};

export function getPaymentMethodLabel(method: PaymentMethod | null) {
  switch (method) {
    case "cash_on_receipt":
      return "Наличными при получении";
    case "online_card":
      return "Картой при получении";
    case "sbp":
      return "Переводом после звонка";
    default:
      return "Оплата уточняется";
  }
}
