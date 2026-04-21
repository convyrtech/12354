import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askOpenrouter } from "@/lib/waiter/waiter-openrouter";
import type { WaiterContext } from "@/lib/waiter/waiter-types";

const TEST_CONTEXT: WaiterContext = {
  user: {
    name: "Андрей",
    history: [
      {
        date: "2026-04-18",
        items: [
          {
            itemId: "item_crayfish_boiled",
            modifiers: {
              mg_boiled_recipe: "recipe_spicy_tomato",
            },
            qty: 1,
            price: 5900,
          },
        ],
        total: 5900,
        payment: "online",
      },
    ],
    paymentPreference: "online",
    preferredCity: "moscow",
  },
  cart: [],
  cityId: "moscow",
  now: new Date("2026-04-21T12:00:00.000Z"),
};

describe("askOpenrouter", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.WAITER_MODEL = "deepseek/deepseek-chat:free";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.WAITER_MODEL;
  });

  it("falls back to the mock waiter when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const response = await askOpenrouter("Что взять к ракам?", TEST_CONTEXT);

    expect(response.reply).toContain("короткие запросы");
    expect(response.signature).toBe("— официант");
    expect(response.mode).toBe("dialog");
  });

  it("falls back to the mock waiter when the model returns invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "not-json-at-all",
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await askOpenrouter("Что взять к ракам?", TEST_CONTEXT);

    expect(response.reply).toContain("короткие запросы");
    expect(response.signature).toBe("— официант");
  });

  it("returns the model reply when OpenRouter responds with valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    reply: "К ракам можно тихо добавить мидии или оставить стол как есть.",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await askOpenrouter("Что взять к ракам?", TEST_CONTEXT);

    expect(response.reply).toBe(
      "К ракам можно тихо добавить мидии или оставить стол как есть.",
    );
    expect(response.signature).toBe("— официант");
  });
});
