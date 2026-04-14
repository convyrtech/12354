import "server-only";

import type {
  AssignmentStatus,
  CourierStatus,
  CourierVehicleType,
} from "@/lib/courier/types";
import { getCourierRepositories } from "@/server/courier/repositories/runtime";
import { syncIikoProviderStatesForStoredOrders } from "@/server/orders/iiko-sync";
import { listStoredOrders } from "@/server/orders/storage";
import type {
  StoredOrderProviderCommandState,
  StoredOrderProviderSyncLookupMode,
  StoredOrderRecord,
} from "@/server/orders/types";

export type OrderDispatchOpsView = {
  assignmentId: string | null;
  status: AssignmentStatus | null;
  statusNote: string | null;
  courier: {
    id: string;
    displayName: string;
    status: CourierStatus;
    vehicleType: CourierVehicleType;
  } | null;
  trackingPath: string | null;
};

export type OrderProviderOpsView = {
  providerLabel: string;
  providerState:
    | "not_applicable"
    | "local_queue"
    | "submitted_to_provider"
    | "sync_failed";
  externalReference: string | null;
  correlationId: string | null;
  note: string;
  sync: {
    syncedAt: string | null;
    lookupMode: StoredOrderProviderSyncLookupMode | null;
    commandState: StoredOrderProviderCommandState | null;
    deliveryStatus: string | null;
    trackingLink: string | null;
    completeBefore: string | null;
    hasProblem: boolean;
    problemDescription: string | null;
    courierName: string | null;
  };
};

export type OrderOpsView = {
  order: StoredOrderRecord;
  dispatch: OrderDispatchOpsView;
  provider: OrderProviderOpsView;
};

function buildEmptyProviderSyncView(): OrderProviderOpsView["sync"] {
  return {
    syncedAt: null,
    lookupMode: null,
    commandState: null,
    deliveryStatus: null,
    trackingLink: null,
    completeBefore: null,
    hasProblem: false,
    problemDescription: null,
    courierName: null,
  };
}

function buildProviderView(order: StoredOrderRecord): OrderProviderOpsView {
  const providerSync = order.providerSync;
  const syncView: OrderProviderOpsView["sync"] = providerSync
    ? {
        syncedAt: providerSync.syncedAt,
        lookupMode: providerSync.lookupMode,
        commandState: providerSync.commandState,
        deliveryStatus: providerSync.deliveryStatus,
        trackingLink: providerSync.trackingLink,
        completeBefore: providerSync.completeBefore,
        hasProblem: providerSync.hasProblem === true,
        problemDescription: providerSync.problemDescription,
        courierName: providerSync.courierName,
      }
    : buildEmptyProviderSyncView();

  if (order.submission.channel === "iiko") {
    const isProviderError =
      order.submission.status === "sync_failed" ||
      providerSync?.commandState === "Error" ||
      providerSync?.creationStatus === "Error";

    return {
      providerLabel: "iiko",
      providerState: isProviderError ? "sync_failed" : "submitted_to_provider",
      externalReference: order.submission.externalReference,
      correlationId: order.submission.correlationId,
      note:
        providerSync?.note ||
        order.submission.lastError ||
        (order.submission.externalReference
          ? "Заказ передан в iiko и ожидает следующего статуса от провайдера."
          : "Заказ передан в iiko, но внешний orderId еще не подтвержден."),
      sync: syncView,
    };
  }

  if (order.fulfillment.mode !== "delivery") {
    return {
      providerLabel: "not_applicable",
      providerState: "not_applicable",
      externalReference: null,
      correlationId: null,
      note: "Для этого сценария provider reverse sync не требуется.",
      sync: buildEmptyProviderSyncView(),
    };
  }

  return {
    providerLabel: "local_queue",
    providerState: "local_queue",
    externalReference: null,
    correlationId: null,
    note: "Заказ пока живет в локальном ops-слое без внешнего provider handoff.",
    sync: buildEmptyProviderSyncView(),
  };
}

export async function listOrderOpsViews(limit = 50): Promise<OrderOpsView[]> {
  const [storedOrders, repositories] = await Promise.all([
    listStoredOrders(limit),
    getCourierRepositories(),
  ]);

  const orders = await syncIikoProviderStatesForStoredOrders(storedOrders);
  const allAssignments = await repositories.assignments.list();
  const assignmentByOrderId = new Map(
    allAssignments.map((assignment) => [assignment.orderId, assignment]),
  );

  return Promise.all(
    orders.map(async (order) => {
      const assignment = assignmentByOrderId.get(order.reference) ?? null;
      const courier = assignment?.courierId
        ? await repositories.couriers.getById(assignment.courierId)
        : null;
      const activeToken = assignment
        ? (
            await repositories.trackingTokens.listByAssignmentId(assignment.id)
          ).find((tokenRecord) => tokenRecord.revokedAt === null) ?? null
        : null;

      return {
        order,
        dispatch: {
          assignmentId: assignment?.id ?? null,
          status: assignment?.status ?? null,
          statusNote: assignment?.statusNote ?? null,
          courier: courier
            ? {
                id: courier.id,
                displayName: courier.displayName,
                status: courier.status,
                vehicleType: courier.vehicleType,
              }
            : null,
          trackingPath: activeToken ? `/track/${activeToken.token}` : null,
        },
        provider: buildProviderView(order),
      } satisfies OrderOpsView;
    }),
  );
}
