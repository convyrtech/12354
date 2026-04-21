import type { WaiterContext, WaiterResponse } from "@/lib/waiter/waiter-types";
import { askMock } from "@/lib/waiter/waiter-mock";

function waiterMode(): "mock" | "openrouter" {
  if (process.env.NEXT_PUBLIC_WAITER_MODE === "openrouter") return "openrouter";
  return "mock";
}

// Phase 5 will replace this stub with a fetch to /api/waiter/respond. For
// Phase 4 every call resolves to the mock so the UI surface is stable.
async function askOpenrouter(
  userMessage: string | null,
  context: WaiterContext,
): Promise<WaiterResponse> {
  return askMock(userMessage, context);
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
