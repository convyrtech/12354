"use client";

import { useMemo } from "react";
import { useDraft } from "@/components/draft-provider";
import { useCity } from "@/lib/cities/city-context";
import { useFakeAuth } from "@/hooks/use-fake-auth";
import type { WaiterContext } from "@/lib/waiter/waiter-types";

export function useWaiterContext(): {
  context: WaiterContext;
  hydrated: boolean;
} {
  const { state: auth, hydrated } = useFakeAuth();
  const { cityId } = useCity();
  const { draft } = useDraft();

  const context = useMemo<WaiterContext>(
    () => ({
      user:
        hydrated && auth.name
          ? {
              name: auth.name,
              phone: auth.phone,
              history: auth.orderHistory,
              paymentPreference: auth.paymentPreference,
              preferredCity: auth.preferredCity,
            }
          : null,
      cart: draft.lineItems,
      cityId,
      now: new Date(),
    }),
    [auth, hydrated, cityId, draft.lineItems],
  );

  return { context, hydrated };
}
