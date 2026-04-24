import { describe, expect, it } from "vitest";
import { MOCK_ANDREY } from "@/lib/waiter/mock-user-andrey";
import { askMock } from "@/lib/waiter/waiter-mock";
import type { WaiterContext } from "@/lib/waiter/waiter-types";

function baseContext(): WaiterContext {
  return {
    user: null,
    cart: [],
    cityId: "moscow",
    now: new Date("2026-04-20T18:00:00Z"),
  };
}

describe("askMock", () => {
  it("null message with no user returns guest greeting + guest chips", () => {
    const response = askMock(null, baseContext());
    expect(response.reply).toContain("Первый заказ");
    expect(response.suggestedChips[0].primary).toBe(true);
    expect(response.suggestedChips[0].action).toEqual({ type: "scroll-to-triptych" });
  });

  it("null message with Andrey history returns tailored greeting + returning chips", () => {
    const ctx: WaiterContext = {
      ...baseContext(),
      user: {
        name: MOCK_ANDREY.name,
        phone: MOCK_ANDREY.phone,
        history: MOCK_ANDREY.orderHistory,
      },
    };
    const response = askMock(null, ctx);
    expect(response.reply).toMatch(/томатн|том-ям/i);
    expect(response.suggestedChips[0].action).toEqual({ type: "repeat-last" });
  });

  it("'повторить' message routes to repeat ack with dialog mode", () => {
    const response = askMock("Повторить последний", baseContext());
    expect(response.mode).toBe("dialog");
    expect(response.reply).toContain("Повторил прошлый заказ");
  });

  it("unknown free-form message falls back to deflect (never empty reply)", () => {
    const response = askMock("какое сегодня пиво?", baseContext());
    expect(response.mode).toBe("dialog");
    expect(response.reply.length).toBeGreaterThan(10);
  });
});
