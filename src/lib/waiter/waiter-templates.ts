import type { WaiterChip } from "@/lib/waiter/waiter-types";

export const GUEST_GREETING = {
  reply:
    "Первый раз у нас. Если хотите — соберём стол. Или гляньте, что берут чаще всего.",
  signature: "— официант",
};

export const RETURNING_GREETING_FALLBACK = {
  reply: "Рады, что вернулись. Что сегодня собираем?",
  signature: "— официант",
};

export function andreyGreeting(anchorRecipe?: string): {
  reply: string;
  signature: string;
} {
  if (anchorRecipe === "recipe_spicy_tomato") {
    return {
      reply: "Как обычно — томатные L и цезарь? Или поэкспериментируем сегодня?",
      signature: "— официант",
    };
  }
  if (anchorRecipe === "recipe_tom_yam") {
    return {
      reply: "Вижу, вы тянете к том-ям. Оставить как в прошлый раз или попробуем другое?",
      signature: "— официант",
    };
  }
  return {
    reply: "Рад вас видеть. Повторим прошлый стол или зайдём иначе?",
    signature: "— официант",
  };
}

export const GUEST_CHIPS: WaiterChip[] = [
  {
    label: "Что берут чаще всего →",
    primary: true,
    action: { type: "scroll-to-triptych" },
  },
  { label: "Поможете с выбором?", action: { type: "focus-waiter" } },
  { label: "Соберу сам", action: { type: "scroll-to", anchor: "raki" } },
];

export const RETURNING_CHIPS: WaiterChip[] = [
  { label: "Повторить последний →", primary: true, action: { type: "repeat-last" } },
  { label: "Другие рецепты раков", action: { type: "scroll-to", anchor: "raki" } },
  { label: "Что-то новенькое", action: { type: "scroll-to-triptych" } },
];

export const REPEAT_LAST_ACK = {
  reply:
    "Собрал последний заказ. Проверьте корзину — там можно поправить размер или вес.",
  signature: "— официант",
};

export const FREE_FORM_DEFLECT = {
  reply: "Запомнил. Прямо сейчас я понимаю короткие запросы лучше — попробуйте «Том-ям» или «без остроты».",
  signature: "— официант",
};
