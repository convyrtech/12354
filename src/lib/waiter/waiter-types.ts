import type { CityId } from "@/lib/cities/cities-config";
import type { DraftLineItem } from "@/lib/line-item";

export type HistoricalOrderItem = {
  itemId: string;
  modifiers?: Record<string, string>;
  qty: number;
  price: number;
};

export type HistoricalOrder = {
  date: string;
  items: HistoricalOrderItem[];
  total: number;
  payment: "online" | "cash";
};

export type WaiterUser = {
  name?: string | null;
  phone?: string | null;
  history?: HistoricalOrder[];
  paymentPreference?: "online" | "cash";
  preferredCity?: CityId;
};

export type WaiterContext = {
  user: WaiterUser | null;
  cart: DraftLineItem[];
  cityId: CityId;
  now: Date;
};

export type SerializedWaiterContext = Omit<WaiterContext, "now"> & {
  now: string;
};

export type WaiterApiRequest = {
  userMessage: string | null;
  context: SerializedWaiterContext;
};

export type ChipAction =
  | { type: "repeat-last" }
  | { type: "scroll-to"; anchor: string }
  | { type: "scroll-to-triptych" }
  | { type: "focus-waiter" };

export type WaiterChip = {
  label: string;
  primary?: boolean;
  action: ChipAction;
};

export type RecommendationReason = "frequent" | "companion" | "novelty" | "signature";

export type RecommendationItem = {
  itemId: string;
  reason: RecommendationReason;
  reasonText: string;
};

export type WaiterMode = "hero" | "dialog" | "cart";

export type WaiterResponse = {
  reply: string;
  signature: string;
  suggestedChips: WaiterChip[];
  suggestedItems?: RecommendationItem[];
  mode: WaiterMode;
};
