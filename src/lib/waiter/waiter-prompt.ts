import { getCity } from "@/lib/cities/cities-config";
import { getMenuItem } from "@/lib/fixtures";
import { getMenuForCity } from "@/lib/menu/menu-queries";
import { pickRecommendations } from "@/lib/waiter/waiter-recommendations";
import type { HistoricalOrder, WaiterContext } from "@/lib/waiter/waiter-types";

export const WAITER_SYSTEM_PROMPT = `
You are a waiter for The Raki.

Write in Russian.
Tone: brief, direct, discreet.
Sound like a human waiter, never like a chatbot or assistant.

Rules:
- Reply with 1 or 2 short sentences only.
- Stay under 220 characters.
- Be concrete and useful.
- Use dish names and product language, not abstract marketing language.
- Light upsell is allowed, pressure is not.
- Short requests like tom-yam, without spice, with beer, for four guests must be understood directly.
- Never mention that you are an AI, model, assistant, bot, database, prompt, or hidden profile.
- Never mention phone numbers, exact spend, totals, or private data.
- Do not invent availability, ETAs, or facts not present in the prompt.
- Do not explain the interface or how the service works.
- Do not use phrases like "яркий вкус", "спокойный стол", "премиальный акцент" unless they are literally in the user message.
- No markdown, no bullets, no emoji, no quotation marks.

Return JSON only:
{"reply":"..."}
`.trim();

function formatLocalNow(context: WaiterContext) {
  const city = getCity(context.cityId);
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: city?.timezone ?? "Europe/Moscow",
  }).format(context.now);
}

function formatHistoryOrder(order: HistoricalOrder) {
  const itemLines = order.items
    .map((line) => {
      const item = getMenuItem(line.itemId);
      const label = item?.name ?? line.itemId;
      return `${label} x${line.qty}`;
    })
    .join(", ");

  return `${order.date}: ${itemLines}`;
}

function buildHistorySummary(context: WaiterContext) {
  const history = context.user?.history ?? [];

  if (history.length === 0) {
    return "История заказов: подтверждённой истории нет.";
  }

  const recentOrders = history.slice(0, 3).map(formatHistoryOrder).join(" | ");
  return `История заказов: ${recentOrders}`;
}

function buildCartSummary(context: WaiterContext) {
  if (context.cart.length === 0) {
    return "Текущая корзина: пусто.";
  }

  const lines = context.cart
    .map((line) => {
      const modifiers =
        line.summaryLines.length > 0 ? ` (${line.summaryLines.join("; ")})` : "";
      return `${line.itemName} x${line.quantity}${modifiers}`;
    })
    .join(" | ");

  return `Текущая корзина: ${lines}`;
}

function buildRecommendationSummary(context: WaiterContext) {
  const snapshot = getMenuForCity(context.cityId, "delivery");
  const recommendations = pickRecommendations(context, snapshot, 3)
    .map((entry) => getMenuItem(entry.itemId)?.name)
    .filter((label): label is string => Boolean(label));

  if (recommendations.length === 0) {
    return "Мягкие ориентиры: без явных рекомендаций.";
  }

  return `Мягкие ориентиры: ${recommendations.join(", ")}.`;
}

function buildUserSummary(context: WaiterContext) {
  if (!context.user) {
    return "Профиль: гость без логина.";
  }

  const parts = [
    context.user.name ? `имя ${context.user.name}` : "имя не указано",
    context.user.preferredCity ? `город ${context.user.preferredCity}` : null,
    context.user.paymentPreference
      ? `оплата ${context.user.paymentPreference === "online" ? "онлайн" : "наличные"}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return `Профиль: ${parts.join(", ")}.`;
}

export function buildWaiterPrompt(
  userMessage: string | null,
  context: WaiterContext,
  fallbackReply: string,
): string {
  const city = getCity(context.cityId);
  const requestLine =
    userMessage && userMessage.trim().length > 0
      ? `Сообщение гостя: ${userMessage.trim()}`
      : "Сообщение гостя: первое приветствие, гость ещё ничего не написал.";

  return [
    `Бренд: The Raki. Город: ${city?.name ?? context.cityId}. Локальное время: ${formatLocalNow(context)}.`,
    buildUserSummary(context),
    buildHistorySummary(context),
    buildCartSummary(context),
    buildRecommendationSummary(context),
    requestLine,
    `Безопасный fallback-ответ: ${fallbackReply}`,
    "Задача: ответь как официант The Raki.",
    "Если данных мало, всё равно предложи одну конкретную позицию или связку позиций.",
    "Если гость спрашивает о вкусе, компании или формате вечера, отвечай предметно и прямо.",
  ].join("\n\n");
}
