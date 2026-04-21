import "server-only";

import { getCheckoutIssues, normalizeRuPhone } from "@/lib/checkout";
import type { OrderDraftContext } from "@/lib/draft";
import { getDraftCartView, getFulfillmentLabel } from "@/lib/draft-view";
import { getDeliveryDecisionLabel, getDeliveryFulfillmentSourceLabel } from "@/lib/delivery-policy";
import {
  getAddressConfidenceLabel,
  getDeliveryDropoffSourceLabel,
} from "@/lib/fixtures";
import { getPaymentMethodLabel, type SubmittedOrderSummary } from "@/lib/orders";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { ensureAssignmentPublicTrackingToken } from "@/server/courier/public-tracking-service";
import { ensureOrderDispatchAssignment } from "@/server/orders/dispatch";
import { pushSiteTrackingLinkToIiko } from "@/server/orders/iiko-sync";
import { type OrderProviderSubmission, submitOrderViaProvider } from "@/server/orders/provider";
import { findStoredOrderByIdempotencyKey, persistStoredOrder } from "@/server/orders/storage";
import type { StoredOrderRecord } from "@/server/orders/types";

export class OrderSubmissionError extends Error {
  code: "invalid_request" | "empty_cart";

  constructor(code: "invalid_request" | "empty_cart", message: string) {
    super(message);
    this.code = code;
  }
}

function buildOrderReference(createdAt: string, sessionId: string) {
  const date = new Date(createdAt);
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const suffix = sessionId.replace(/^draft_/, "").slice(0, 4).toUpperCase();
  return `TR-${yy}${mm}${dd}-${suffix || "SITE"}`;
}

function getGuestLabel(draft: OrderDraftContext) {
  return draft.customerName.trim() || "Гость";
}

function buildSubmittedOrderSummary(
  record: StoredOrderRecord,
  trackingHref = record.summary.trackingHref ?? null,
): SubmittedOrderSummary {
  return {
    reference: record.reference,
    createdAt: record.createdAt,
    total: record.cart.total,
    totalLabel: record.cart.totalLabel,
    lineCount: record.cart.lineCount,
    guestLabel: record.guest.name,
    fulfillmentLabel: getFulfillmentLabel(record.fulfillment.mode),
    serviceLabel: record.fulfillment.serviceLabel,
    handoffLabel: record.submission.destinationLabel,
    handoffStatus: record.submission.status,
    externalReference: record.submission.externalReference,
    trackingHref,
    opsHref: "/ops/orders",
  };
}

function buildStoredOrderRecord(input: {
  draft: OrderDraftContext;
  createdAt: string;
  reference: string;
  submission: OrderProviderSubmission;
}): StoredOrderRecord {
  const { draft, createdAt, reference, submission } = input;
  const cart = getDraftCartView(draft);
  const serviceLabel =
    cart.serviceLabel ||
    (draft.fulfillmentMode === "pickup"
      ? "Точка самовывоза уточняется"
      : "Адрес подтверждается командой");
  const timingLabel =
    cart.serviceTimingLabel ||
    cart.etaLabel ||
    draft.requestedTimeLabel ||
    (draft.fulfillmentMode === "pickup"
      ? "Окно выдачи уточняется"
      : "Время подтверждается после маршрута");

  return {
    reference,
    createdAt,
    status: "new",
    source: "site_storefront",
    idempotencyKey: draft.idempotencyKey,
    sessionId: draft.sessionId,
    guest: {
      name: getGuestLabel(draft),
      phone: draft.customerPhone,
      comment: draft.customerComment.trim(),
    },
    fulfillment: {
      mode: draft.fulfillmentMode,
      serviceLabel,
      timingLabel,
      zoneId: draft.zoneId,
      locationId: draft.locationId,
      servicePointId: draft.servicePointId,
      confirmedDropoffLabel:
        draft.confirmedDropoffLabel || draft.normalizedAddress || draft.typedAddress,
      confirmedDropoffSource: getDeliveryDropoffSourceLabel(draft.confirmedDropoffSource),
      addressConfidence: getAddressConfidenceLabel(draft.addressConfidence),
      decisionLabel: getDeliveryDecisionLabel({
        deliveryState: draft.deliveryState,
        decisionState: draft.deliveryDecisionState,
      }),
      fulfillmentSourceLabel: getDeliveryFulfillmentSourceLabel(draft.deliveryFulfillmentSource),
      resolverNote: draft.resolverNote,
    },
    cart: {
      lineCount: cart.lineCount,
      subtotal: cart.subtotal,
      subtotalLabel: cart.subtotalLabel,
      fee: cart.fee,
      total: cart.total,
      totalLabel: cart.totalLabel,
      items: cart.lineItems.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        summaryLines: item.summaryLines,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    },
    payment: {
      method: draft.paymentMethod ?? "unresolved",
      label: getPaymentMethodLabel(draft.paymentMethod),
    },
    submission: {
      channel: submission.channel,
      status: submission.status,
      destinationLabel: submission.destinationLabel,
      externalReference: submission.externalReference,
      correlationId: submission.correlationId,
      lastError: submission.lastError,
    },
    providerSync: null,
    summary: {
      reference,
      createdAt,
      total: cart.total,
      totalLabel: cart.totalLabel,
      lineCount: cart.lineCount,
      guestLabel: getGuestLabel(draft),
      fulfillmentLabel: getFulfillmentLabel(draft.fulfillmentMode),
      serviceLabel,
      handoffLabel: submission.destinationLabel,
      handoffStatus: submission.status,
      externalReference: submission.externalReference,
      trackingHref: null,
      opsHref: "/ops/orders",
    },
    draftSnapshot: draft,
  };
}

async function ensurePublicTrackingHref(record: StoredOrderRecord) {
  if (record.fulfillment.mode !== "delivery") {
    return null;
  }

  try {
    const assignment = await ensureOrderDispatchAssignment(record);

    if (!assignment) {
      return null;
    }

    const tokenRecord = await ensureAssignmentPublicTrackingToken(assignment.id);
    return `/track/${tokenRecord.token}`;
  } catch (error) {
    console.error("Failed to ensure order public tracking token", {
      reference: record.reference,
      error,
    });
    return record.summary.trackingHref ?? null;
  }
}

async function syncStoredTrackingHref(record: StoredOrderRecord, trackingHref: string | null) {
  if ((record.summary.trackingHref ?? null) === trackingHref) {
    return record;
  }

  const nextRecord: StoredOrderRecord = {
    ...record,
    summary: {
      ...record.summary,
      trackingHref,
    },
  };

  await persistStoredOrder(nextRecord);
  return nextRecord;
}


function buildAbsoluteTrackingLink(
  relativeTrackingHref: string | null,
  publicSiteOrigin: string | null,
) {
  if (!relativeTrackingHref || !publicSiteOrigin) {
    return null;
  }

  if (/^https?:\/\//i.test(relativeTrackingHref)) {
    return relativeTrackingHref;
  }

  const path = relativeTrackingHref.startsWith("/")
    ? relativeTrackingHref
    : `/${relativeTrackingHref}`;

  return `${publicSiteOrigin}${path}`;
}

async function syncTrackingHrefToProvider(
  record: StoredOrderRecord,
  relativeTrackingHref: string | null,
  publicSiteOrigin: string | null,
) {
  const absoluteTrackingLink = buildAbsoluteTrackingLink(relativeTrackingHref, publicSiteOrigin);

  if (!absoluteTrackingLink) {
    return;
  }

  await pushSiteTrackingLinkToIiko(record, absoluteTrackingLink);
}

export async function submitDraftOrder(
  rawDraft: OrderDraftContext,
  options: {
    publicSiteOrigin?: string | null;
  } = {},
) {
  const draft: OrderDraftContext = {
    ...rawDraft,
    customerName: rawDraft.customerName.trim(),
    customerPhone: normalizeRuPhone(rawDraft.customerPhone),
    customerComment: rawDraft.customerComment.trim(),
  };
  const publicSiteOrigin = resolvePublicSiteOrigin(options.publicSiteOrigin);

  if (draft.lineItems.length === 0) {
    throw new OrderSubmissionError("empty_cart", "Корзина пуста.");
  }

  const issues = getCheckoutIssues(draft);
  if (issues.length > 0 || !draft.paymentMethod) {
    throw new OrderSubmissionError(
      "invalid_request",
      issues[0]?.message ?? "Не удалось собрать заказ.",
    );
  }

  const existing = await findStoredOrderByIdempotencyKey(draft.idempotencyKey);
  if (existing) {
    const trackingHref = await ensurePublicTrackingHref(existing);
    const syncedRecord = await syncStoredTrackingHref(existing, trackingHref);
    await syncTrackingHrefToProvider(syncedRecord, trackingHref, publicSiteOrigin);

    return {
      record: syncedRecord,
      summary: buildSubmittedOrderSummary(syncedRecord, trackingHref),
      duplicate: true,
    };
  }

  const createdAt = new Date().toISOString();
  const reference = buildOrderReference(createdAt, draft.sessionId);
  const submission = await submitOrderViaProvider(draft, reference);
  const record = buildStoredOrderRecord({
    draft,
    createdAt,
    reference,
    submission,
  });

  await persistStoredOrder(record);

  const trackingHref = await ensurePublicTrackingHref(record);
  const syncedRecord = await syncStoredTrackingHref(record, trackingHref);
  await syncTrackingHrefToProvider(syncedRecord, trackingHref, publicSiteOrigin);

  return {
    record: syncedRecord,
    summary: buildSubmittedOrderSummary(syncedRecord, trackingHref),
    duplicate: false,
  };
}
