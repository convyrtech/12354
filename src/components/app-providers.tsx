"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CartPill } from "@/components/cart-pill";
import { DraftProvider } from "@/components/draft-provider";
import { Navigation } from "@/components/navigation";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { getRouteMode } from "@/lib/route-mode";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [demoParam, setDemoParam] = useState<string | null>(null);
  const routeMode = getRouteMode(pathname, demoParam);

  useEffect(() => {
    setDemoParam(new URLSearchParams(window.location.search).get("demo"));
  }, [pathname]);

  useEffect(() => {
    document.body.dataset.routeMode = routeMode;

    return () => {
      delete document.body.dataset.routeMode;
    };
  }, [routeMode]);

  return (
    <DraftProvider key={routeMode} mode={routeMode}>
      <SmoothScrollProvider>
        {routeMode === "public" ? (
          <>
            <Navigation />
            <CartPill />
          </>
        ) : null}
        {children}
      </SmoothScrollProvider>
    </DraftProvider>
  );
}
