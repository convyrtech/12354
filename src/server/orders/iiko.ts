import "server-only";

import { randomUUID } from "node:crypto";
import type { OrderDraftContext } from "@/lib/draft";
import { getMenuItem } from "@/lib/fixtures";
import type { OrderProviderSubmission } from "@/server/orders/provider";
import {
  getIikoConfig,
  hasResolvedMappings,
  type IikoBindings,
  type IikoConfig,
  type IikoModifierBinding,
  type IikoPaymentKind,
} from "@/server/orders/iiko-config";

type IikoCreateOrderItem = {
  type: "Product";
  productId: string;
  amount: number;
  price: number;
  positionId: string;
  modifiers?: Array<{
    productId: string;
    amount: number;
    price?: number;
    productGroupId?: string;
    positionId?: string;
  }>;
};

type IikoCreateOrderRequest = {
  organizationId: string;
  terminalGroupId?: string;
  order: {
    externalNumber: string;
    phone: string;
    customer: {
      type: "one-time";
      name: string;
    };
    comment?: string;
    sourceKey: string;
    orderTypeId?: string;
    orderServiceType?: "DeliveryByCourier" | "DeliveryByClient";
    deliveryPoint?: {
      coordinates?: {
        latitude: number;
        longitude: number;
      };
      address?: {
        street: {
          name: string;
        };
        house: string;
        flat?: string;
        entrance?: string;
        floor?: string;
        doorphone?: string;
      };
      externalCartographyId?: string;
      comment?: string;
    };
    payments?: Array<{
      paymentTypeKind: IikoPaymentKind;
      paymentTypeId: string;
      sum: number;
      isProcessedExternally: boolean;
    }>;
    items: IikoCreateOrderItem[];
  };
};

function resolveMappedValue(
  mapping: Record<string, string> | undefined,
  key: string | null,
  fallback: string | null,
  missingMessage: string,
) {
  if (key && mapping?.[key]) {
    return mapping[key];
  }

  if (fallback) {
    return fallback;
  }

  throw new Error(missingMessage);
}

export function resolveIikoOrganizationIdForDraft(
  draft: Pick<OrderDraftContext, "legalEntityId">,
  config: IikoConfig,
) {
  return resolveMappedValue(
    config.bindings?.organizations,
    draft.legalEntityId,
    config.defaultOrganizationId,
    "Для текущего юрлица не задан iiko organizationId.",
  );
}

function toInternationalPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("7") && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.startsWith("8") && digits.length === 11) {
    return `+7${digits.slice(1)}`;
  }

  if (phone.startsWith("+")) {
    return phone;
  }

  return `+${digits}`;
}

function pickFirstAddressSource(draft: OrderDraftContext) {
  return (
    draft.normalizedAddress ||
    draft.confirmedDropoffLabel ||
    draft.typedAddress ||
    draft.serviceLabel ||
    ""
  ).trim();
}

function parseAddressPart(rawValue: string) {
  const value = rawValue.replace(/\s+/g, " ").trim();
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const primary = parts[0] ?? value;
  const primaryMatch = primary.match(
    /^(.*?)(?:\s+|,\s*|,\s*д\.?\s*| д\.?\s*)(\d+[а-яa-z0-9/-]*)$/i,
  );

  let streetName = primary;
  let house = "";

  if (primaryMatch) {
    streetName = primaryMatch[1].trim().replace(/,\s*$/, "");
    house = primaryMatch[2].trim();
  } else {
    streetName = primary;
    house = parts[1] ?? "";
  }

  const metadata = {
    flat: "",
    entrance: "",
    floor: "",
    doorphone: "",
  };

  parts.slice(primaryMatch ? 1 : 2).forEach((part) => {
    const normalized = part.toLowerCase();

    if (!metadata.flat && /(кв|квартира)/i.test(normalized)) {
      metadata.flat = part.replace(/^(кв\.?|квартира)\s*/i, "").trim();
      return;
    }

    if (!metadata.entrance && /(подъезд|под\.?)/i.test(normalized)) {
      metadata.entrance = part.replace(/^(подъезд|под\.?)\s*/i, "").trim();
      return;
    }

    if (!metadata.floor && /(этаж|эт\.?)/i.test(normalized)) {
      metadata.floor = part.replace(/^(этаж|эт\.?)\s*/i, "").trim();
      return;
    }

    if (!metadata.doorphone && /домофон/i.test(normalized)) {
      metadata.doorphone = part.replace(/^домофон\s*/i, "").trim();
      return;
    }

    if (!house && /\d/.test(part)) {
      house = part.replace(/^д\.?\s*/i, "").trim();
    }
  });

  if (!streetName || !house) {
    throw new Error("Для iiko нужен адрес хотя бы с улицей и домом.");
  }

  return {
    streetName,
    house,
    ...metadata,
  };
}

function resolveModifierBinding(binding: IikoModifierBinding) {
  if (typeof binding === "string") {
    return {
      productId: binding,
      productGroupId: undefined,
      amount: 1,
    };
  }

  return {
    productId: binding.productId,
    productGroupId: binding.productGroupId,
    amount: binding.amount ?? 1,
  };
}

function buildIikoItems(draft: OrderDraftContext, bindings: IikoBindings) {
  return draft.lineItems.map((lineItem) => {
    const item = getMenuItem(lineItem.itemId);

    if (!item) {
      throw new Error(`Товар ${lineItem.itemId} отсутствует в текущем каталоге.`);
    }

    const productId = bindings.products?.[lineItem.itemId];
    if (!productId) {
      throw new Error(`Для товара ${lineItem.itemId} не задан iiko productId.`);
    }

    const modifiers = lineItem.selections.flatMap((selection) =>
      selection.optionIds.map((optionId) => {
        const modifierBinding = bindings.modifiers?.[optionId];

        if (!modifierBinding) {
          throw new Error(`Для модификатора ${optionId} не задан iiko binding.`);
        }

        const resolvedBinding = resolveModifierBinding(modifierBinding);

        return {
          productId: resolvedBinding.productId,
          productGroupId: resolvedBinding.productGroupId,
          amount: resolvedBinding.amount,
          positionId: randomUUID(),
        };
      }),
    );

    const result: IikoCreateOrderItem = {
      type: "Product",
      productId,
      amount: lineItem.quantity,
      price: lineItem.unitPrice,
      positionId: randomUUID(),
    };

    if (modifiers.length > 0) {
      result.modifiers = modifiers;
    }

    return result;
  });
}

function buildIikoComment(draft: OrderDraftContext) {
  const commentParts = [
    draft.customerComment.trim(),
    draft.courierInstructions.trim(),
    draft.resolverNote.trim(),
  ].filter(Boolean);

  return commentParts.length > 0 ? commentParts.join(" | ").slice(0, 490) : undefined;
}

function buildIikoPayments(
  draft: OrderDraftContext,
  bindings: IikoBindings,
  total: number,
) {
  if (!draft.paymentMethod) {
    return undefined;
  }

  const paymentBinding = bindings.payments?.[draft.paymentMethod];
  if (!paymentBinding) {
    return undefined;
  }

  return [
    {
      paymentTypeKind: paymentBinding.paymentTypeKind,
      paymentTypeId: paymentBinding.paymentTypeId,
      sum: total,
      isProcessedExternally: paymentBinding.isProcessedExternally ?? false,
    },
  ];
}

function buildIikoPayload(
  draft: OrderDraftContext,
  reference: string,
  config: IikoConfig,
): IikoCreateOrderRequest {
  const bindings = config.bindings;

  if (!bindings) {
    throw new Error("iiko bindings не настроены.");
  }

  const organizationId = resolveIikoOrganizationIdForDraft(draft, config);
  const terminalGroupId =
    draft.fulfillmentMode === "pickup" || draft.servicePointId
      ? resolveMappedValue(
          bindings.terminalGroups,
          draft.servicePointId,
          config.defaultTerminalGroupId,
          "Для текущей точки не задан iiko terminalGroupId.",
        )
      : config.defaultTerminalGroupId ?? undefined;

  const items = buildIikoItems(draft, bindings);
  const payments = buildIikoPayments(
    draft,
    bindings,
    draft.lineItems.reduce((sum, lineItem) => sum + lineItem.totalPrice, 0) +
      (draft.liveDeliveryQuoteAmount ?? 0),
  );
  const orderTypeId = bindings.orderTypes?.[draft.fulfillmentMode ?? "delivery"];

  const order: IikoCreateOrderRequest["order"] = {
    externalNumber: reference,
    phone: toInternationalPhone(draft.customerPhone),
    customer: {
      type: "one-time",
      name: draft.customerName.trim(),
    },
    sourceKey: config.sourceKey,
    items,
  };

  const comment = buildIikoComment(draft);
  if (comment) {
    order.comment = comment;
  }

  if (orderTypeId) {
    order.orderTypeId = orderTypeId;
  } else {
    order.orderServiceType =
      draft.fulfillmentMode === "pickup" ? "DeliveryByClient" : "DeliveryByCourier";
  }

  if (payments) {
    order.payments = payments;
  }

  if (draft.fulfillmentMode === "delivery") {
    const parsedAddress = parseAddressPart(pickFirstAddressSource(draft));

    order.deliveryPoint = {
      externalCartographyId: draft.sessionId,
      comment: draft.confirmedDropoffLabel || draft.courierInstructions || undefined,
      address: {
        street: {
          name: parsedAddress.streetName,
        },
        house: parsedAddress.house,
        ...(parsedAddress.flat ? { flat: parsedAddress.flat } : {}),
        ...(parsedAddress.entrance ? { entrance: parsedAddress.entrance } : {}),
        ...(parsedAddress.floor ? { floor: parsedAddress.floor } : {}),
        ...(parsedAddress.doorphone ? { doorphone: parsedAddress.doorphone } : {}),
      },
      ...(draft.confirmedDropoffLat !== null && draft.confirmedDropoffLng !== null
        ? {
            coordinates: {
              latitude: draft.confirmedDropoffLat,
              longitude: draft.confirmedDropoffLng,
            },
          }
        : {}),
    };
  }

  return {
    organizationId,
    ...(terminalGroupId ? { terminalGroupId } : {}),
    order,
  };
}

export async function getIikoAccessToken(config: IikoConfig) {
  if (!config.apiLogin) {
    throw new Error("IIKO_API_LOGIN не задан.");
  }

  const response = await fetch(`${config.apiBaseUrl}/api/1/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiLogin: config.apiLogin,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as { token?: string; errorDescription?: string };

  if (!response.ok || !payload.token) {
    throw new Error(payload.errorDescription || `Не удалось получить iiko token (${response.status}).`);
  }

  return payload.token;
}

function extractIikoError(payload: Record<string, unknown>) {
  const candidate =
    (typeof payload.errorDescription === "string" && payload.errorDescription) ||
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.description === "string" && payload.description);

  return candidate || null;
}

export async function hasIikoTransportConfigured() {
  const config = await getIikoConfig();
  const bindings = config.bindings;

  if (!config.apiLogin || !bindings || !hasResolvedMappings(bindings)) {
    return false;
  }

  return Boolean(
    (config.defaultOrganizationId || Object.keys(bindings.organizations ?? {}).length > 0) &&
      (config.defaultTerminalGroupId || Object.keys(bindings.terminalGroups ?? {}).length > 0),
  );
}

export async function submitOrderToIiko(
  draft: OrderDraftContext,
  reference: string,
): Promise<OrderProviderSubmission> {
  const config = await getIikoConfig();
  const token = await getIikoAccessToken(config);
  const requestPayload = buildIikoPayload(draft, reference, config);

  const response = await fetch(`${config.apiBaseUrl}/api/1/deliveries/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestPayload),
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      extractIikoError(payload) || `iiko create delivery завершился ошибкой (${response.status}).`,
    );
  }

  return {
    channel: "iiko",
    status: "submitted",
    destinationLabel: "iiko",
    externalReference: typeof payload.orderId === "string" ? payload.orderId : null,
    correlationId: typeof payload.correlationId === "string" ? payload.correlationId : null,
    lastError: null,
  };
}
