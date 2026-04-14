import type { OrderDraftContext } from "@/lib/draft";
import type {
  OrderSubmissionChannel,
  OrderSubmissionStatus,
  SubmittedOrderSummary,
} from "@/lib/orders";

export type StoredOrderStatus = "new";

export type StoredOrderProviderSyncLookupMode = "deliveries_by_id" | "commands_status";

export type StoredOrderProviderCommandState = "InProgress" | "Success" | "Error";

export type StoredOrderProviderCreationState = "Success" | "InProgress" | "Error";

export type StoredOrderProviderSyncRecord = {
  provider: "iiko";
  syncedAt: string;
  lookupMode: StoredOrderProviderSyncLookupMode;
  providerOrderId: string | null;
  commandState: StoredOrderProviderCommandState | null;
  commandError: string | null;
  creationStatus: StoredOrderProviderCreationState | null;
  deliveryStatus: string | null;
  trackingLink: string | null;
  completeBefore: string | null;
  whenCreated: string | null;
  whenConfirmed: string | null;
  whenCookingCompleted: string | null;
  whenSended: string | null;
  whenDelivered: string | null;
  whenClosed: string | null;
  deliveryDurationMinutes: number | null;
  hasProblem: boolean | null;
  problemDescription: string | null;
  courierName: string | null;
  courierPhone: string | null;
  courierSelectedManually: boolean | null;
  note: string;
};

export type StoredOrderRecord = {
  reference: string;
  createdAt: string;
  status: StoredOrderStatus;
  source: "site_storefront" | "site_prototype";
  idempotencyKey: string;
  sessionId: string;
  guest: {
    name: string;
    phone: string;
    comment: string;
  };
  fulfillment: {
    mode: OrderDraftContext["fulfillmentMode"];
    serviceLabel: string;
    timingLabel: string;
    zoneId: string | null;
    locationId: string | null;
    servicePointId: string | null;
    confirmedDropoffLabel: string;
    confirmedDropoffSource: string;
    addressConfidence: string;
    decisionLabel: string;
    fulfillmentSourceLabel: string;
    resolverNote: string;
  };
  cart: {
    lineCount: number;
    subtotal: number;
    subtotalLabel: string;
    fee: number;
    total: number;
    totalLabel: string;
    items: {
      itemId: string;
      itemName: string;
      quantity: number;
      summaryLines: string[];
      unitPrice: number;
      totalPrice: number;
    }[];
  };
  payment: {
    method: string;
    label: string;
  };
  submission: {
    channel: OrderSubmissionChannel;
    status: OrderSubmissionStatus;
    destinationLabel: string;
    externalReference: string | null;
    correlationId: string | null;
    lastError: string | null;
  };
  providerSync: StoredOrderProviderSyncRecord | null;
  summary: SubmittedOrderSummary;
  draftSnapshot: OrderDraftContext;
};
