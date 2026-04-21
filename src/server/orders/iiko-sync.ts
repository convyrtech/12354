import "server-only";

import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { getIikoAccessToken, resolveIikoOrganizationIdForDraft } from "@/server/orders/iiko";
import { getIikoConfig, type IikoConfig } from "@/server/orders/iiko-config";
import { persistStoredOrder } from "@/server/orders/storage";
import type {
  StoredOrderProviderCommandState,
  StoredOrderProviderCreationState,
  StoredOrderProviderSyncRecord,
  StoredOrderRecord,
} from "@/server/orders/types";

const PROVIDER_SYNC_TTL_MS = 60_000;
const IIKO_BATCH_LIMIT = 200;

type IikoErrorInfo = {
  message?: string | null;
  description?: string | null;
  errorReason?: string | null;
};

type IikoCommandStatusResponse = {
  state?: StoredOrderProviderCommandState;
  errorReason?: string | null;
  exception?: unknown;
};

type IikoDeliveryOrderResponse = {
  status?: string | null;
  completeBefore?: string | null;
  whenCreated?: string | null;
  whenConfirmed?: string | null;
  whenCookingCompleted?: string | null;
  whenSended?: string | null;
  whenDelivered?: string | null;
  whenClosed?: string | null;
  deliveryDuration?: number | null;
  trackingLink?: string | null;
  problem?: {
    hasProblem?: boolean;
    description?: string | null;
  } | null;
  courierInfo?: {
    courier?: {
      name?: string | null;
      phone?: string | null;
    } | null;
    isCourierSelectedManually?: boolean;
  } | null;
};

type IikoOrderInfoResponse = {
  id?: string | null;
  externalNumber?: string | null;
  creationStatus?: StoredOrderProviderCreationState;
  errorInfo?: IikoErrorInfo | null;
  order?: IikoDeliveryOrderResponse | null;
};

type IikoOrdersByIdResponse = {
  correlationId?: string | null;
  orders?: IikoOrderInfoResponse[] | null;
};

type IikoOrdersByOrganizationResponse = {
  organizationId?: string | null;
  orders?: IikoOrderInfoResponse[] | null;
};

type IikoOrdersWithRevisionResponse = {
  correlationId?: string | null;
  maxRevision?: number | null;
  ordersByOrganizations?: IikoOrdersByOrganizationResponse[] | null;
};

class IikoSyncError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getErrorMessage(payload: Record<string, unknown>) {
  return (
    getText(payload.errorDescription) ||
    getText(payload.message) ||
    getText(payload.description) ||
    null
  );
}

async function postIikoJson<TResponse>(
  config: IikoConfig,
  token: string,
  pathname: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(`${config.apiBaseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new IikoSyncError(
      getErrorMessage(payload) || `iiko sync request failed (${response.status}).`,
      response.status,
    );
  }

  return payload as TResponse;
}

function isProviderSyncFresh(record: StoredOrderRecord) {
  if (!record.providerSync?.syncedAt) {
    return false;
  }

  const syncedAt = Date.parse(record.providerSync.syncedAt);
  if (!Number.isFinite(syncedAt)) {
    return false;
  }

  return Date.now() - syncedAt < PROVIDER_SYNC_TTL_MS;
}

function chunkItems<TItem>(items: TItem[], chunkSize: number) {
  const chunks: TItem[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildCommandSnapshot(input: {
  record: StoredOrderRecord;
  state: StoredOrderProviderCommandState | null;
  note: string;
  commandError?: string | null;
}): StoredOrderProviderSyncRecord {
  return {
    provider: "iiko",
    syncedAt: new Date().toISOString(),
    lookupMode: "commands_status",
    providerOrderId: input.record.submission.externalReference,
    commandState: input.state,
    commandError: input.commandError ?? null,
    creationStatus: null,
    deliveryStatus: null,
    trackingLink: null,
    completeBefore: null,
    whenCreated: null,
    whenConfirmed: null,
    whenCookingCompleted: null,
    whenSended: null,
    whenDelivered: null,
    whenClosed: null,
    deliveryDurationMinutes: null,
    hasProblem: null,
    problemDescription: null,
    courierName: null,
    courierPhone: null,
    courierSelectedManually: null,
    note: input.note,
  };
}

function buildDeliverySnapshot(input: {
  record: StoredOrderRecord;
  correlationId: string | null;
  orderInfo: IikoOrderInfoResponse | null;
  note: string;
}): StoredOrderProviderSyncRecord {
  const order = input.orderInfo?.order ?? null;
  const courier = order?.courierInfo?.courier ?? null;
  const problem = order?.problem ?? null;

  return {
    provider: "iiko",
    syncedAt: new Date().toISOString(),
    lookupMode: "deliveries_by_id",
    providerOrderId: getText(input.orderInfo?.id) ?? input.record.submission.externalReference,
    commandState: null,
    commandError: null,
    creationStatus: input.orderInfo?.creationStatus ?? null,
    deliveryStatus: getText(order?.status),
    trackingLink: getText(order?.trackingLink),
    completeBefore: getText(order?.completeBefore),
    whenCreated: getText(order?.whenCreated),
    whenConfirmed: getText(order?.whenConfirmed),
    whenCookingCompleted: getText(order?.whenCookingCompleted),
    whenSended: getText(order?.whenSended),
    whenDelivered: getText(order?.whenDelivered),
    whenClosed: getText(order?.whenClosed),
    deliveryDurationMinutes:
      typeof order?.deliveryDuration === "number" && Number.isFinite(order.deliveryDuration)
        ? order.deliveryDuration
        : null,
    hasProblem: typeof problem?.hasProblem === "boolean" ? problem.hasProblem : null,
    problemDescription: getText(problem?.description),
    courierName: getText(courier?.name),
    courierPhone: getText(courier?.phone),
    courierSelectedManually:
      typeof order?.courierInfo?.isCourierSelectedManually === "boolean"
        ? order.courierInfo.isCourierSelectedManually
        : null,
    note: input.note,
  };
}

function buildDeliveryNote(orderInfo: IikoOrderInfoResponse | null) {
  if (!orderInfo) {
    return "iiko не вернул заказ по указанному orderId.";
  }

  if (orderInfo.creationStatus === "Error") {
    return (
      getText(orderInfo.errorInfo?.message) ||
      getText(orderInfo.errorInfo?.errorReason) ||
      getText(orderInfo.errorInfo?.description) ||
      "iiko вернул ошибку создания заказа."
    );
  }

  if (orderInfo.creationStatus === "InProgress") {
    return "Заказ еще обрабатывается в iiko, финальный delivery status пока не подтвержден.";
  }

  const deliveryStatus = getText(orderInfo.order?.status);
  const problemDescription = getText(orderInfo.order?.problem?.description);

  if (orderInfo.order?.problem?.hasProblem) {
    return problemDescription
      ? `iiko пометил заказ как проблемный: ${problemDescription}`
      : "iiko пометил заказ как проблемный.";
  }

  if (deliveryStatus) {
    return `Текущий статус в iiko: ${deliveryStatus}.`;
  }

  return "Заказ найден в iiko, но текущий delivery status не заполнен.";
}

function buildCommandNote(
  state: StoredOrderProviderCommandState | null,
  errorReason: string | null,
  statusCode: number | null = null,
) {
  if (statusCode === 410) {
    return "iiko больше не хранит указанный correlationId; нужен ручной контроль по заказу.";
  }

  switch (state) {
    case "InProgress":
      return "Команда создания заказа еще выполняется в iiko; orderId пока не подтвержден.";
    case "Success":
      return "Команда iiko завершилась успешно, но внешний orderId еще не зафиксирован в локальном snapshot.";
    case "Error":
      return errorReason || "Команда iiko завершилась ошибкой.";
    default:
      return errorReason || "Не удалось получить актуальный command status из iiko.";
  }
}


function buildAbsoluteTrackingLinkForSync(
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

async function persistProviderSync(
  record: StoredOrderRecord,
  providerSync: StoredOrderProviderSyncRecord,
) {
  const nextRecord: StoredOrderRecord = {
    ...record,
    providerSync,
  };

  await persistStoredOrder(nextRecord);
  return nextRecord;
}

async function persistRecoveredExternalReference(
  record: StoredOrderRecord,
  orderInfo: IikoOrderInfoResponse,
) {
  const providerOrderId = getText(orderInfo.id);

  if (!providerOrderId) {
    return record;
  }

  const nextRecord: StoredOrderRecord = {
    ...record,
    submission: {
      ...record.submission,
      externalReference: providerOrderId,
    },
    summary: {
      ...record.summary,
      externalReference: providerOrderId,
    },
  };

  await persistStoredOrder(nextRecord);
  return nextRecord;
}

function shouldSyncRecord(record: StoredOrderRecord) {
  if (record.submission.channel !== "iiko") {
    return false;
  }

  if (!record.submission.externalReference && !record.submission.correlationId) {
    return false;
  }

  return !isProviderSyncFresh(record);
}

async function syncCommandStatusCandidate(input: {
  record: StoredOrderRecord;
  config: IikoConfig;
  token: string;
  organizationId: string;
}) {
  const { record, config, token, organizationId } = input;
  const correlationId = record.submission.correlationId;

  if (!correlationId) {
    return record;
  }

  try {
    const payload = await postIikoJson<IikoCommandStatusResponse>(
      config,
      token,
      "/api/1/commands/status",
      {
        organizationId,
        correlationId,
      },
    );

    return persistProviderSync(
      record,
      buildCommandSnapshot({
        record,
        state: payload.state ?? null,
        commandError: getText(payload.errorReason),
        note: buildCommandNote(payload.state ?? null, getText(payload.errorReason)),
      }),
    );
  } catch (error) {
    if (error instanceof IikoSyncError && error.status === 410) {
      return persistProviderSync(
        record,
        buildCommandSnapshot({
          record,
          state: null,
          commandError: "correlationId expired",
          note: buildCommandNote(null, null, 410),
        }),
      );
    }

    console.error("Failed to sync iiko command status", {
      reference: record.reference,
      error,
    });
    return record;
  }
}

async function recoverExternalReferenceCandidate(input: {
  record: StoredOrderRecord;
  config: IikoConfig;
  token: string;
  organizationId: string;
}) {
  const { record, config, token, organizationId } = input;

  if (record.submission.externalReference) {
    return record;
  }

  if (record.providerSync?.commandState !== "Success") {
    return record;
  }

  try {
    const payload = await postIikoJson<IikoOrdersWithRevisionResponse>(
      config,
      token,
      "/api/1/deliveries/by_delivery_date_and_source_key_and_filter",
      {
        organizationIds: [organizationId],
        sourceKeys: [config.sourceKey],
        searchText: record.reference,
        rowsCount: 20,
      },
    );

    const orderInfo =
      payload.ordersByOrganizations
        ?.flatMap((entry) => entry.orders ?? [])
        .find((candidate) => getText(candidate.externalNumber) === record.reference) ?? null;

    if (!orderInfo) {
      return record;
    }

    const recordWithExternalReference = await persistRecoveredExternalReference(record, orderInfo);
    const recordWithProviderSync = await persistProviderSync(
      recordWithExternalReference,
      buildDeliverySnapshot({
        record: recordWithExternalReference,
        correlationId: getText(payload.correlationId),
        orderInfo,
        note: buildDeliveryNote(orderInfo),
      }),
    );

    const absoluteTrackingLink = buildAbsoluteTrackingLinkForSync(
      recordWithProviderSync.summary.trackingHref ?? null,
      resolvePublicSiteOrigin(),
    );

    if (absoluteTrackingLink) {
      await pushSiteTrackingLinkToIiko(recordWithProviderSync, absoluteTrackingLink);
    }

    return recordWithProviderSync;
  } catch (error) {
    console.error("Failed to recover iiko externalReference", {
      reference: record.reference,
      error,
    });
    return record;
  }
}

export async function syncIikoProviderStatesForStoredOrders(records: StoredOrderRecord[]) {
  const candidates = records.filter(shouldSyncRecord);

  if (candidates.length === 0) {
    return records;
  }

  const config = await getIikoConfig();

  if (!config.apiLogin) {
    return records;
  }

  let token: string;

  try {
    token = await getIikoAccessToken(config);
  } catch (error) {
    console.error("Failed to get iiko access token for provider sync", {
      error,
    });
    return records;
  }

  const nextByReference = new Map(records.map((record) => [record.reference, record]));
  const groupedByOrganization = new Map<
    string,
    Array<{ record: StoredOrderRecord; externalReference: string }>
  >();
  const commandCandidates: Array<{
    record: StoredOrderRecord;
    organizationId: string;
  }> = [];

  for (const record of candidates) {
    let organizationId: string;

    try {
      organizationId = resolveIikoOrganizationIdForDraft(record.draftSnapshot, config);
    } catch (error) {
      console.error("Failed to resolve iiko organization for stored order", {
        reference: record.reference,
        error,
      });
      continue;
    }

    const externalReference = getText(record.submission.externalReference);

    if (externalReference) {
      const bucket = groupedByOrganization.get(organizationId) ?? [];
      bucket.push({
        record,
        externalReference,
      });
      groupedByOrganization.set(organizationId, bucket);
      continue;
    }

    if (record.submission.correlationId) {
      commandCandidates.push({
        record,
        organizationId,
      });
    }
  }

  for (const [organizationId, organizationRecords] of groupedByOrganization.entries()) {
    for (const chunk of chunkItems(organizationRecords, IIKO_BATCH_LIMIT)) {
      try {
        const payload = await postIikoJson<IikoOrdersByIdResponse>(
          config,
          token,
          "/api/1/deliveries/by_id",
          {
            organizationId,
            orderIds: chunk.map((item) => item.externalReference),
          },
        );

        const orderInfoById = new Map(
          (payload.orders ?? [])
            .filter((orderInfo): orderInfo is IikoOrderInfoResponse => Boolean(orderInfo))
            .map((orderInfo) => [getText(orderInfo.id), orderInfo] as const)
            .filter((entry): entry is readonly [string, IikoOrderInfoResponse] => Boolean(entry[0])),
        );

        for (const item of chunk) {
          const orderInfo = orderInfoById.get(item.externalReference) ?? null;
          const updatedRecord = await persistProviderSync(
            item.record,
            buildDeliverySnapshot({
              record: item.record,
              correlationId: getText(payload.correlationId),
              orderInfo,
              note: buildDeliveryNote(orderInfo),
            }),
          );
          nextByReference.set(updatedRecord.reference, updatedRecord);
        }
      } catch (error) {
        console.error("Failed to sync iiko delivery statuses", {
          organizationId,
          references: chunk.map((item) => item.record.reference),
          error,
        });
      }
    }
  }

  const commandResults = await Promise.all(
    commandCandidates.map((item) =>
      syncCommandStatusCandidate({
        record: item.record,
        config,
        token,
        organizationId: item.organizationId,
      }),
    ),
  );

  for (const updatedRecord of commandResults) {
    nextByReference.set(updatedRecord.reference, updatedRecord);
  }

  const recoveredResults = await Promise.all(
    commandCandidates.map((item) =>
      recoverExternalReferenceCandidate({
        record: nextByReference.get(item.record.reference) ?? item.record,
        config,
        token,
        organizationId: item.organizationId,
      }),
    ),
  );

  for (const updatedRecord of recoveredResults) {
    nextByReference.set(updatedRecord.reference, updatedRecord);
  }

  return records.map((record) => nextByReference.get(record.reference) ?? record);
}

function shouldPushTrackingLink(record: StoredOrderRecord, trackingLink: string) {
  if (record.submission.channel !== "iiko") {
    return false;
  }

  if (record.fulfillment.mode !== "delivery") {
    return false;
  }

  if (!record.submission.externalReference) {
    return false;
  }

  if (!trackingLink.trim()) {
    return false;
  }

  return record.providerSync?.trackingLink !== trackingLink;
}

export async function pushSiteTrackingLinkToIiko(
  record: StoredOrderRecord,
  trackingLink: string,
) {
  if (!shouldPushTrackingLink(record, trackingLink)) {
    return;
  }

  const config = await getIikoConfig();

  if (!config.apiLogin) {
    return;
  }

  try {
    const organizationId = resolveIikoOrganizationIdForDraft(record.draftSnapshot, config);
    const token = await getIikoAccessToken(config);

    await postIikoJson<void>(config, token, "/api/1/deliveries/update_tracking_link", {
      organizationId,
      orderId: record.submission.externalReference,
      trackingLink,
    });
  } catch (error) {
    console.error("Failed to push site tracking link to iiko", {
      reference: record.reference,
      externalReference: record.submission.externalReference,
      error,
    });
  }
}
