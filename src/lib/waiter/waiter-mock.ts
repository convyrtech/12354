import { RAKI_RECIPE_GROUP_ID } from "@/lib/menu/recipes";
import type {
  WaiterChip,
  WaiterContext,
  WaiterResponse,
} from "@/lib/waiter/waiter-types";
import {
  andreyGreeting,
  FREE_FORM_DEFLECT,
  GUEST_CHIPS,
  GUEST_GREETING,
  REPEAT_LAST_ACK,
  RETURNING_CHIPS,
  RETURNING_GREETING_FALLBACK,
} from "@/lib/waiter/waiter-templates";

const BOILED_RECIPE_GROUP_ID = RAKI_RECIPE_GROUP_ID.boiled;
const BOILED_ANCHOR_ITEM_ID = "item_crayfish_boiled";

type KeywordReply = {
  includes: string[];
  reply: string;
};

type CompoundReply = {
  includesAll: string[];
  includesAny?: string[];
  reply: string;
};

const COMPOUND_REPLIES: CompoundReply[] = [
  {
    includesAll: ["пив"],
    includesAny: ["четверых", "четверо", "4", "компания", "гости", "гостей"],
    reply:
      "К пиву на четверых возьмите варёных раков и мидии. Если нужно плотнее, добавьте жареных раков.",
  },
  {
    includesAll: ["пив"],
    includesAny: ["двоих", "двое", "2", "на двоих"],
    reply:
      "На двоих к пиву хватит варёных раков. Если хотите вторую позицию, добавьте мидии.",
  },
  {
    includesAll: ["краб"],
    includesAny: ["икра", "икру", "икрой"],
    reply:
      "Краб и икра хорошо идут вместе. Если нужен базовый заказ, начните с раков и потом добавьте одну из этих позиций.",
  },
  {
    includesAll: ["первый раз"],
    reply:
      "Для первого заказа начните с варёных раков. Дальше можно добавить мидии или краба.",
  },
  {
    includesAll: ["с чего начать"],
    reply:
      "Начните с варёных раков. Второй позицией хорошо идут мидии.",
  },
  {
    includesAll: ["что берут"],
    reply:
      "Чаще всего берут варёных раков. Второй позицией обычно добавляют мидии.",
  },
];

const KEYWORD_REPLIES: KeywordReply[] = [
  {
    includes: ["пив", "к пиву"],
    reply:
      "К пиву начните с варёных раков. Если нужна вторая позиция, добавьте мидии.",
  },
  {
    includes: ["четверых", "четверо", "4", "компания"],
    reply:
      "На четверых возьмите раков как базу и мидии второй позицией.",
  },
  {
    includes: ["двоих", "двое", "2", "на двоих"],
    reply:
      "На двоих хорошо идут варёные раки. Если хотите вторую позицию, добавьте мидии.",
  },
  {
    includes: ["гости", "гостей", "гостям", "стол"],
    reply:
      "Если заказ на компанию, начните с раков и добавьте мидии.",
  },
  {
    includes: ["без остроты", "неостро", "не остро"],
    reply:
      "Если без остроты, берите классических раков и мидии не в том-яме.",
  },
  {
    includes: ["остро", "поострее", "том-ям", "том ям"],
    reply:
      "Если хочется острого, берите мидии в том-яме. Из раков лучше оставить классический рецепт.",
  },
  {
    includes: ["краб", "краба", "крабу"],
    reply:
      "Краба лучше добавлять к основному заказу, а не начинать с него. Базой я бы оставил раков.",
  },
  {
    includes: ["икра", "икру", "икрой"],
    reply:
      "Икру лучше брать дополнительно к основному заказу. Хорошо идёт с крабом.",
  },
  {
    includes: ["мидии", "мидий", "мидиями"],
    reply:
      "Мидии хорошо идут второй позицией к ракам.",
  },
  {
    includes: ["раки", "раков", "ракам"],
    reply:
      "Если нужна базовая позиция, начинайте с раков. Дальше можно добавить мидии или краба.",
  },
  {
    includes: ["что взять", "посоветуй", "посоветуйте", "выбрать", "выбор"],
    reply:
      "Напишите коротко: на сколько человек, к чему или без чего.",
  },
];

function latestAnchorRecipe(context: WaiterContext): string | undefined {
  const lastOrder = context.user?.history?.[0];
  if (!lastOrder) return undefined;
  const rakiLine = lastOrder.items.find(
    (line) =>
      line.itemId === BOILED_ANCHOR_ITEM_ID &&
      line.modifiers?.[BOILED_RECIPE_GROUP_ID],
  );
  return rakiLine?.modifiers?.[BOILED_RECIPE_GROUP_ID];
}

function buildGreeting(context: WaiterContext): WaiterResponse {
  const user = context.user;
  const hasHistory = Boolean(user?.history && user.history.length > 0);

  if (hasHistory) {
    const greeting = andreyGreeting(latestAnchorRecipe(context));
    return {
      reply: greeting.reply,
      signature: greeting.signature,
      suggestedChips: RETURNING_CHIPS,
      mode: "hero",
    };
  }

  if (user?.name) {
    return {
      reply: RETURNING_GREETING_FALLBACK.reply,
      signature: RETURNING_GREETING_FALLBACK.signature,
      suggestedChips: RETURNING_CHIPS,
      mode: "hero",
    };
  }

  return {
    reply: GUEST_GREETING.reply,
    signature: GUEST_GREETING.signature,
    suggestedChips: GUEST_CHIPS,
    mode: "hero",
  };
}

function greetingChips(context: WaiterContext): WaiterChip[] {
  const hasHistory = Boolean(
    context.user?.history && context.user.history.length > 0,
  );
  return hasHistory ? RETURNING_CHIPS : GUEST_CHIPS;
}

function pickKeywordReply(normalized: string): string | null {
  for (const candidate of COMPOUND_REPLIES) {
    const hasAll = candidate.includesAll.every((needle) => normalized.includes(needle));
    if (!hasAll) continue;
    if (
      candidate.includesAny &&
      !candidate.includesAny.some((needle) => normalized.includes(needle))
    ) {
      continue;
    }
    return candidate.reply;
  }

  for (const candidate of KEYWORD_REPLIES) {
    if (candidate.includes.some((needle) => normalized.includes(needle))) {
      return candidate.reply;
    }
  }
  return null;
}

export function askMock(
  userMessage: string | null,
  context: WaiterContext,
): WaiterResponse {
  if (userMessage == null || userMessage.trim() === "") {
    return buildGreeting(context);
  }

  const normalized = userMessage.trim().toLowerCase();

  if (normalized.includes("повтор")) {
    return {
      reply: REPEAT_LAST_ACK.reply,
      signature: REPEAT_LAST_ACK.signature,
      suggestedChips: greetingChips(context),
      mode: "dialog",
    };
  }

  const keywordReply = pickKeywordReply(normalized);
  if (keywordReply) {
    return {
      reply: keywordReply,
      signature: "Официант",
      suggestedChips: greetingChips(context),
      mode: "dialog",
    };
  }

  return {
    reply: FREE_FORM_DEFLECT.reply,
    signature: FREE_FORM_DEFLECT.signature,
    suggestedChips: greetingChips(context),
    mode: "dialog",
  };
}
