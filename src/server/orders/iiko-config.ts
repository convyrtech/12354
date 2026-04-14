import "server-only";

import path from "node:path";
import { readFile } from "node:fs/promises";
import type { PaymentMethod } from "@/lib/fixtures";

export type IikoModifierBinding =
  | string
  | {
      productId: string;
      productGroupId?: string;
      amount?: number;
    };

export type IikoPaymentKind = "Cash" | "Card" | "External";

export type IikoPaymentBinding = {
  paymentTypeId: string;
  paymentTypeKind: IikoPaymentKind;
  isProcessedExternally?: boolean;
};

export type IikoBindings = {
  sourceKey?: string;
  organizations?: Record<string, string>;
  terminalGroups?: Record<string, string>;
  products?: Record<string, string>;
  modifiers?: Record<string, IikoModifierBinding>;
  orderTypes?: Partial<Record<"delivery" | "pickup", string>>;
  payments?: Partial<Record<PaymentMethod, IikoPaymentBinding>>;
};

export type IikoConfig = {
  apiBaseUrl: string;
  apiLogin: string | null;
  defaultOrganizationId: string | null;
  defaultTerminalGroupId: string | null;
  sourceKey: string;
  bindings: IikoBindings | null;
};

const PLACEHOLDER_IDENTIFIER = "00000000-0000-0000-0000-000000000000";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeIdentifier(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized === PLACEHOLDER_IDENTIFIER) {
    return null;
  }

  return normalized;
}

function normalizeStringMap(value: unknown) {
  const record = asRecord(value);

  if (!record) {
    return undefined;
  }

  const entries = Object.entries(record)
    .map(([key, entryValue]) => {
      const normalizedValue = normalizeIdentifier(entryValue);
      return normalizedValue ? ([key, normalizedValue] as const) : null;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeModifierBinding(value: unknown): IikoModifierBinding | null {
  const simple = normalizeIdentifier(value);

  if (simple) {
    return simple;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const productId = normalizeIdentifier(record.productId);
  if (!productId) {
    return null;
  }

  return {
    productId,
    ...(normalizeIdentifier(record.productGroupId)
      ? { productGroupId: normalizeIdentifier(record.productGroupId)! }
      : {}),
    ...(typeof record.amount === "number" && Number.isFinite(record.amount) && record.amount > 0
      ? { amount: record.amount }
      : {}),
  };
}

function normalizeModifierMap(value: unknown) {
  const record = asRecord(value);

  if (!record) {
    return undefined;
  }

  const entries = Object.entries(record)
    .map(([key, entryValue]) => {
      const normalizedValue = normalizeModifierBinding(entryValue);
      return normalizedValue ? ([key, normalizedValue] as const) : null;
    })
    .filter((entry): entry is readonly [string, IikoModifierBinding] => Boolean(entry));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizePaymentBinding(value: unknown): IikoPaymentBinding | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const paymentTypeId = normalizeIdentifier(record.paymentTypeId);
  const paymentTypeKind = record.paymentTypeKind;

  if (
    !paymentTypeId ||
    (paymentTypeKind !== "Cash" && paymentTypeKind !== "Card" && paymentTypeKind !== "External")
  ) {
    return null;
  }

  return {
    paymentTypeId,
    paymentTypeKind,
    ...(typeof record.isProcessedExternally === "boolean"
      ? { isProcessedExternally: record.isProcessedExternally }
      : {}),
  };
}

function normalizePaymentsMap(value: unknown) {
  const record = asRecord(value);

  if (!record) {
    return undefined;
  }

  const entries = Object.entries(record)
    .map(([key, entryValue]) => {
      const normalizedValue = normalizePaymentBinding(entryValue);
      return normalizedValue ? ([key, normalizedValue] as const) : null;
    })
    .filter((entry): entry is readonly [PaymentMethod, IikoPaymentBinding] => Boolean(entry));

  return entries.length > 0
    ? (Object.fromEntries(entries) as Partial<Record<PaymentMethod, IikoPaymentBinding>>)
    : undefined;
}

function normalizeBindings(value: unknown): IikoBindings | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  return {
    sourceKey: typeof record.sourceKey === "string" ? record.sourceKey.trim() || undefined : undefined,
    organizations: normalizeStringMap(record.organizations),
    terminalGroups: normalizeStringMap(record.terminalGroups),
    products: normalizeStringMap(record.products),
    modifiers: normalizeModifierMap(record.modifiers),
    orderTypes: normalizeStringMap(record.orderTypes) as IikoBindings["orderTypes"],
    payments: normalizePaymentsMap(record.payments),
  };
}

async function loadBindingsFromFile(filePath: string) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const fileRaw = await readFile(resolvedPath, "utf8");
  return normalizeBindings(JSON.parse(fileRaw));
}

async function loadBindings() {
  const inlineJson = process.env.IIKO_BINDINGS_JSON?.trim();
  if (inlineJson) {
    return normalizeBindings(JSON.parse(inlineJson));
  }

  const filePath = process.env.IIKO_BINDINGS_FILE?.trim();
  if (!filePath) {
    return null;
  }

  return loadBindingsFromFile(filePath);
}

export async function getIikoConfig(): Promise<IikoConfig> {
  const bindings = await loadBindings();

  return {
    apiBaseUrl: (process.env.IIKO_API_BASE_URL?.trim() || "https://api-ru.iiko.services").replace(
      /\/+$/,
      "",
    ),
    apiLogin: process.env.IIKO_API_LOGIN?.trim() || null,
    defaultOrganizationId: normalizeIdentifier(process.env.IIKO_ORGANIZATION_ID),
    defaultTerminalGroupId: normalizeIdentifier(process.env.IIKO_TERMINAL_GROUP_ID),
    sourceKey: process.env.IIKO_SOURCE_KEY?.trim() || bindings?.sourceKey || "theraki-site",
    bindings,
  };
}

export function hasResolvedMappings(bindings: IikoBindings | null) {
  if (!bindings) {
    return false;
  }

  return Boolean(
    Object.keys(bindings.products ?? {}).length > 0 &&
      Object.keys(bindings.modifiers ?? {}).length > 0 &&
      Object.keys(bindings.payments ?? {}).length > 0,
  );
}
