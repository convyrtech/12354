import "server-only";

import { createDeliveryAssignment } from "@/server/courier/assignment-service";
import { getCourierRepositories } from "@/server/courier/repositories/runtime";
import type { StoredOrderRecord } from "@/server/orders/types";

function shouldCreateDispatchAssignment(order: StoredOrderRecord) {
  return order.fulfillment.mode === "delivery";
}

function buildDispatchStatusNote(order: StoredOrderRecord) {
  if (order.submission.status === "sync_failed") {
    return "Заказ ждёт назначения курьера и ручной проверки handoff в iiko.";
  }

  if (order.submission.status === "submitted") {
    return "Заказ передан в iiko и ждёт назначения курьера.";
  }

  return "Заказ принят операционным слоем и ждёт назначения курьера.";
}

function getDropoffAddressLabel(order: StoredOrderRecord) {
  return (
    order.fulfillment.confirmedDropoffLabel.trim() ||
    order.draftSnapshot.confirmedDropoffLabel.trim() ||
    order.draftSnapshot.normalizedAddress.trim() ||
    order.draftSnapshot.typedAddress.trim() ||
    order.fulfillment.serviceLabel.trim()
  );
}

export async function ensureOrderDispatchAssignment(order: StoredOrderRecord) {
  if (!shouldCreateDispatchAssignment(order)) {
    return null;
  }

  const repositories = await getCourierRepositories();
  const existing =
    (
      await repositories.assignments.list({
        orderId: order.reference,
      })
    )[0] ?? null;

  if (existing) {
    return existing;
  }

  return createDeliveryAssignment(
    {
      orderId: order.reference,
      orderLabel: order.reference,
      courierId: null,
      kitchenId: order.fulfillment.locationId,
      kitchenLabel: null,
      customerLabel: order.guest.name,
      dropoffAddressLabel: getDropoffAddressLabel(order),
      dropoffLat: order.draftSnapshot.confirmedDropoffLat,
      dropoffLng: order.draftSnapshot.confirmedDropoffLng,
      statusNote: buildDispatchStatusNote(order),
    },
    {
      repositories,
    },
  );
}
