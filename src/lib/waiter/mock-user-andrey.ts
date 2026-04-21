import type { FakeAuthState } from "@/hooks/use-fake-auth";
import type { HistoricalOrder } from "@/lib/waiter/waiter-types";

// Seed data for the investor-demo returning-user flow. Every itemId below
// MUST exist in src/lib/fixtures.ts — a test in mock-user-andrey.test.ts
// pins this invariant. Modifier selections use the same group/option ids as
// fixtures, so repeat-last rebuilds a valid DraftLineItem without guessing.
const ANDREY_HISTORY: HistoricalOrder[] = [
  {
    date: "2026-04-18",
    items: [
      {
        itemId: "item_crayfish_boiled",
        modifiers: {
          mg_boiled_size_tier: "size_l",
          mg_boiled_recipe: "recipe_spicy_tomato",
          mg_boiled_weight: "weight_1kg",
        },
        qty: 1,
        price: 5900,
      },
      {
        itemId: "item_mussels_pesto",
        modifiers: { mg_mussels_pesto_weight: "mussels_pesto_1kg" },
        qty: 1,
        price: 3000,
      },
    ],
    total: 8900,
    payment: "online",
  },
  {
    date: "2026-04-16",
    items: [
      {
        itemId: "item_crayfish_boiled",
        modifiers: {
          mg_boiled_size_tier: "size_l",
          mg_boiled_recipe: "recipe_tom_yam",
          mg_boiled_weight: "weight_1kg",
        },
        qty: 1,
        price: 6100,
      },
      {
        itemId: "item_shrimp_magadan_boiled",
        modifiers: { mg_shrimp_weight: "shrimp_weight_1kg" },
        qty: 1,
        price: 4400,
      },
    ],
    total: 10500,
    payment: "online",
  },
  {
    date: "2026-04-12",
    items: [
      {
        itemId: "item_crayfish_boiled",
        modifiers: {
          mg_boiled_size_tier: "size_l",
          mg_boiled_recipe: "recipe_spicy_tomato",
          mg_boiled_weight: "weight_1kg",
        },
        qty: 1,
        price: 5900,
      },
      {
        itemId: "item_mussels_pesto",
        modifiers: { mg_mussels_pesto_weight: "mussels_pesto_1kg" },
        qty: 1,
        price: 3000,
      },
      {
        itemId: "item_caviar_red",
        modifiers: { mg_caviar_pack: "caviar_pack_250" },
        qty: 1,
        price: 3500,
      },
    ],
    total: 12400,
    payment: "online",
  },
  {
    date: "2026-04-08",
    items: [
      {
        itemId: "item_crayfish_boiled",
        modifiers: {
          mg_boiled_size_tier: "size_l",
          mg_boiled_recipe: "recipe_adjika",
          mg_boiled_weight: "weight_1kg",
        },
        qty: 1,
        price: 6100,
      },
      {
        itemId: "item_mussels_tom_yam",
        modifiers: { mg_mussels_tom_yam_weight: "mussels_ty_one_kg" },
        qty: 1,
        price: 3000,
      },
    ],
    total: 9100,
    payment: "online",
  },
  {
    date: "2026-04-03",
    items: [
      {
        itemId: "item_crayfish_boiled",
        modifiers: {
          mg_boiled_size_tier: "size_l",
          mg_boiled_recipe: "recipe_spicy_tomato",
          mg_boiled_weight: "weight_1kg",
        },
        qty: 1,
        price: 5900,
      },
      {
        itemId: "item_mussels_pesto",
        modifiers: { mg_mussels_pesto_weight: "mussels_pesto_1kg" },
        qty: 1,
        price: 3000,
      },
    ],
    total: 8900,
    payment: "online",
  },
  {
    date: "2026-03-28",
    items: [
      {
        itemId: "item_crayfish_boiled",
        modifiers: {
          mg_boiled_size_tier: "size_xl",
          mg_boiled_recipe: "recipe_tom_yam",
          mg_boiled_weight: "weight_1kg",
        },
        qty: 1,
        price: 6900,
      },
      {
        itemId: "item_shrimp_magadan_boiled",
        modifiers: { mg_shrimp_weight: "shrimp_weight_1kg" },
        qty: 1,
        price: 4400,
      },
    ],
    total: 11300,
    payment: "online",
  },
  {
    date: "2026-03-20",
    items: [
      {
        itemId: "item_crayfish_boiled",
        modifiers: {
          mg_boiled_size_tier: "size_l",
          mg_boiled_recipe: "recipe_spicy_tomato",
          mg_boiled_weight: "weight_1kg",
        },
        qty: 1,
        price: 5900,
      },
      {
        itemId: "item_mussels_pesto",
        modifiers: { mg_mussels_pesto_weight: "mussels_pesto_1kg" },
        qty: 1,
        price: 3000,
      },
    ],
    total: 8900,
    payment: "online",
  },
];

export const MOCK_ANDREY: FakeAuthState = {
  isAuthenticated: true,
  phone: "+7 916 *** ** 52",
  name: "Андрей",
  bonusBalance: 0,
  orderHistory: ANDREY_HISTORY,
  paymentPreference: "online",
  preferredCity: "moscow",
};
