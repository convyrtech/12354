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

export function askMock(
  userMessage: string | null,
  context: WaiterContext,
): WaiterResponse {
  if (userMessage == null || userMessage.trim() === "") {
    return buildGreeting(context);
  }

  const normalised = userMessage.trim().toLowerCase();

  if (normalised.includes("повторить")) {
    return {
      reply: REPEAT_LAST_ACK.reply,
      signature: REPEAT_LAST_ACK.signature,
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

function greetingChips(context: WaiterContext): WaiterChip[] {
  const hasHistory = Boolean(
    context.user?.history && context.user.history.length > 0,
  );
  return hasHistory ? RETURNING_CHIPS : GUEST_CHIPS;
}
