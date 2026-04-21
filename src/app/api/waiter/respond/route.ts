import { NextResponse } from "next/server";
import { z } from "zod";
import { CITY_IDS } from "@/lib/cities/cities-config";
import { askOpenrouter } from "@/lib/waiter/waiter-openrouter";
import { checkWaiterRateLimit } from "@/lib/waiter/waiter-rate-limit";
import type { WaiterContext } from "@/lib/waiter/waiter-types";

export const runtime = "nodejs";

const paymentMethodSchema = z.enum(["online", "cash"]);

const historicalOrderItemSchema = z.object({
  itemId: z.string().min(1),
  modifiers: z.record(z.string()).optional(),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
});

const historicalOrderSchema = z.object({
  date: z.string().min(1),
  items: z.array(historicalOrderItemSchema),
  total: z.number().nonnegative(),
  payment: paymentMethodSchema,
});

const waiterUserSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  history: z.array(historicalOrderSchema).optional(),
  paymentPreference: paymentMethodSchema.optional(),
  preferredCity: z.enum(CITY_IDS).optional(),
});

const draftModifierSelectionSchema = z.object({
  groupId: z.string().min(1),
  optionIds: z.array(z.string()),
});

const draftLineItemSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  quantity: z.number().int().positive(),
  basePrice: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  selections: z.array(draftModifierSelectionSchema),
  summaryLines: z.array(z.string()),
});

const waiterRequestSchema = z.object({
  userMessage: z.string().max(240).nullable(),
  context: z.object({
    user: waiterUserSchema.nullable(),
    cart: z.array(draftLineItemSchema),
    cityId: z.enum(CITY_IDS),
    now: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid ISO datetime."),
  }),
});

function badRequest(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "invalid_request",
        message,
      },
    },
    { status: 400 },
  );
}

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: "Waiter rate limit exceeded.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

function readClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function toWaiterContext(
  input: z.infer<typeof waiterRequestSchema>["context"],
): WaiterContext {
  return {
    ...input,
    now: new Date(input.now),
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = waiterRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("Waiter request payload is invalid.");
  }

  const rateLimit = checkWaiterRateLimit(readClientIp(request));
  if (!rateLimit.allowed) {
    return rateLimited(rateLimit.retryAfterSeconds);
  }

  const response = await askOpenrouter(
    parsed.data.userMessage,
    toWaiterContext(parsed.data.context),
  );

  return NextResponse.json(response);
}
