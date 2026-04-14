import "server-only";

import type { OrderDraftContext } from "@/lib/draft";
import type { OrderSubmissionChannel, OrderSubmissionStatus } from "@/lib/orders";
import { hasIikoTransportConfigured, submitOrderToIiko } from "@/server/orders/iiko";

export type OrderProviderSubmission = {
  channel: OrderSubmissionChannel;
  status: OrderSubmissionStatus;
  destinationLabel: string;
  externalReference: string | null;
  correlationId: string | null;
  lastError: string | null;
};

function buildLocalSubmission(
  overrides: Partial<OrderProviderSubmission> = {},
): OrderProviderSubmission {
  return {
    channel: "local_queue",
    status: "accepted",
    destinationLabel: "Операционный слой The Raki",
    externalReference: null,
    correlationId: null,
    lastError: null,
    ...overrides,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "iiko handoff не выполнен";
}

export async function submitOrderViaProvider(
  draft: OrderDraftContext,
  reference: string,
): Promise<OrderProviderSubmission> {
  if (!(await hasIikoTransportConfigured())) {
    return buildLocalSubmission();
  }

  try {
    return await submitOrderToIiko(draft, reference);
  } catch (error) {
    return buildLocalSubmission({
      status: "sync_failed",
      destinationLabel: "Операционный слой The Raki · требуется проверка",
      lastError: getErrorMessage(error),
    });
  }
}
