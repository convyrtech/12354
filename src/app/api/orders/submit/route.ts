import { NextResponse } from "next/server";
import { hydrateStoredDraft } from "@/lib/draft";
import type { SubmitOrderRequest, SubmitOrderResponse } from "@/lib/orders";
import { OrderSubmissionError, submitDraftOrder } from "@/server/orders/submit-order";

export const runtime = "nodejs";

function invalidRequest(message: string) {
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

export async function POST(request: Request) {
  try {
    let payload: SubmitOrderRequest;

    try {
      payload = (await request.json()) as SubmitOrderRequest;
    } catch {
      return invalidRequest("Request body must be valid JSON.");
    }

    if (!payload || typeof payload !== "object" || !("draft" in payload)) {
      return invalidRequest("Draft payload is required.");
    }

    const draft = hydrateStoredDraft(payload.draft);
    const result = await submitDraftOrder(draft, {
      publicSiteOrigin: new URL(request.url).origin,
    });
    const response: SubmitOrderResponse = {
      order: result.summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof OrderSubmissionError) {
      return invalidRequest(error.message);
    }

    return NextResponse.json(
      {
        error: {
          code: "order_submission_failed",
          message: "Не удалось передать заказ команде.",
        },
      },
      { status: 500 },
    );
  }
}
