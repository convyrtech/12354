import type { WaiterChip } from "@/lib/waiter/waiter-types";

export const GUEST_GREETING = {
  reply:
    "Первый заказ? Начните с раков или напишите, что хотите взять.",
  signature: "Официант",
};

export const RETURNING_GREETING_FALLBACK = {
  reply: "С возвращением. Повторить прошлый заказ или собрать новый?",
  signature: "Официант",
};

export function andreyGreeting(anchorRecipe?: string): {
  reply: string;
  signature: string;
} {
  if (anchorRecipe === "recipe_spicy_tomato") {
    return {
      reply: "Могу повторить томатный рецепт и добрать к нему что-то к пиву.",
      signature: "Официант",
    };
  }

  if (anchorRecipe === "recipe_tom_yam") {
    return {
      reply: "Могу повторить том-ям или собрать другой заказ.",
      signature: "Официант",
    };
  }

  return {
    reply: "С возвращением. Повторить прошлый заказ или собрать новый?",
    signature: "Официант",
  };
}

export const GUEST_CHIPS: WaiterChip[] = [
  { label: "С чего начать", primary: true, action: { type: "scroll-to-triptych" } },
  { label: "Подобрать заказ", action: { type: "focus-waiter" } },
  {
    label: "Сразу к ракам",
    action: { type: "scroll-to", anchor: "editorial-section-raki" },
  },
];

export const RETURNING_CHIPS: WaiterChip[] = [
  {
    label: "Повторить заказ",
    primary: true,
    action: { type: "repeat-last" },
  },
  {
    label: "Сразу к ракам",
    action: { type: "scroll-to", anchor: "editorial-section-raki" },
  },
  { label: "Что взять", action: { type: "scroll-to-triptych" } },
];

export const REPEAT_LAST_ACK = {
  reply: "Повторил прошлый заказ в корзине. Если нужно, добавлю ещё одну позицию.",
  signature: "Официант",
};

export const FREE_FORM_DEFLECT = {
  reply: "Напишите коротко: на сколько человек, к чему или без чего.",
  signature: "Официант",
};
