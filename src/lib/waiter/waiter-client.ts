import type {
  SerializedWaiterContext,
  WaiterApiRequest,
  WaiterContext,
  WaiterResponse,
} from "@/lib/waiter/waiter-types";
import { askMock } from "@/lib/waiter/waiter-mock";

function waiterMode(): "mock" | "openrouter" {
  if (process.env.NEXT_PUBLIC_WAITER_MODE === "openrouter") return "openrouter";
  return "mock";
}

class WaiterClientError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "WaiterClientError";
  }
}

function serializeWaiterContext(context: WaiterContext): SerializedWaiterContext {
  return {
    ...context,
    now: context.now.toISOString(),
  };
}

function isWaiterResponse(payload: unknown): payload is WaiterResponse {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return (
    typeof record.reply === "string" &&
    typeof record.signature === "string" &&
    typeof record.mode === "string" &&
    Array.isArray(record.suggestedChips)
  );
}

async function askOpenrouter(
  userMessage: string | null,
  context: WaiterContext,
): Promise<WaiterResponse> {
  let response: Response;

  try {
    const payload: WaiterApiRequest = {
      userMessage,
      context: serializeWaiterContext(context),
    };

    response = await fetch("/api/waiter/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new WaiterClientError("Waiter API is unavailable.", 0);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new WaiterClientError("Waiter API returned invalid JSON.", response.status);
  }

  if (!response.ok) {
    throw new WaiterClientError("Waiter API request failed.", response.status);
  }

  if (!isWaiterResponse(payload)) {
    throw new WaiterClientError("Waiter API response shape is invalid.", response.status);
  }

  return payload;
}

export async function askWaiter(
  userMessage: string | null,
  context: WaiterContext,
): Promise<WaiterResponse> {
  if (waiterMode() === "openrouter") {
    try {
      return await askOpenrouter(userMessage, context);
    } catch {
      return askMock(userMessage, context);
    }
  }
  return askMock(userMessage, context);
}
