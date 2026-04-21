import { z } from "zod";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { buildWaiterPrompt, WAITER_SYSTEM_PROMPT } from "@/lib/waiter/waiter-prompt";
import { askMock } from "@/lib/waiter/waiter-mock";
import type { WaiterContext, WaiterResponse } from "@/lib/waiter/waiter-types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 8_000;

const WAITER_MODEL =
  process.env.WAITER_MODEL?.trim() || "deepseek/deepseek-chat:free";
const SITE_ORIGIN =
  resolvePublicSiteOrigin() ?? "http://127.0.0.1:3000";

const waiterModelReplySchema = z.object({
  reply: z.string().trim().min(1).max(240),
});

const openRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.union([z.string(), z.array(z.unknown())]).optional(),
        }),
      }),
    )
    .min(1),
});

function isRepeatLastIntent(userMessage: string | null) {
  if (!userMessage) return false;
  return userMessage.trim().toLowerCase().includes("повтор");
}

function extractContentText(content: string | unknown[] | undefined) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") {
        return record.text;
      }
      return "";
    })
    .join("");
}

async function requestModelReply(
  userMessage: string | null,
  context: WaiterContext,
  fallbackReply: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_ORIGIN,
        "X-Title": "The Raki",
      },
      body: JSON.stringify({
        model: WAITER_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content: WAITER_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildWaiterPrompt(userMessage, context, fallbackReply),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with status ${response.status}.`);
    }

    const payload = openRouterResponseSchema.parse(await response.json());
    const rawContent = extractContentText(payload.choices[0]?.message.content);
    const parsed = waiterModelReplySchema.parse(JSON.parse(rawContent));
    return parsed.reply;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function askOpenrouter(
  userMessage: string | null,
  context: WaiterContext,
): Promise<WaiterResponse> {
  const scaffold = askMock(userMessage, context);

  if (isRepeatLastIntent(userMessage)) {
    return scaffold;
  }

  try {
    const reply = await requestModelReply(userMessage, context, scaffold.reply);
    return {
      ...scaffold,
      reply,
    };
  } catch {
    return scaffold;
  }
}
