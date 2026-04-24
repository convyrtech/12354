"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CartPill } from "@/components/cart-pill";
import { DraftProvider } from "@/components/draft-provider";
import { HomeMenu } from "@/components/home-menu/home-menu";
import { Navigation } from "@/components/navigation";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { CityProvider } from "@/lib/cities/city-context";
import { getRouteMode } from "@/lib/route-mode";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [demoParam, setDemoParam] = useState<string | null>(null);
  const routeMode = getRouteMode(pathname, demoParam);
  const isHome = pathname === "/";
  const isProduct = pathname.startsWith("/product/");
  const isCheckout = pathname === "/checkout";
  const isDeliveryAddress = pathname === "/delivery/address";
  const isDeliveryResult = pathname === "/delivery/result";
  const isPickup = pathname === "/pickup";
  const isPickupPoints = pathname === "/pickup/points";
  const isContact = pathname === "/contact";
  const isAccount = pathname === "/account";

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
      <CityProvider>
        <SmoothScrollProvider>
          {routeMode === "public" ? (
            <>
              {isHome ? <HomeMenu /> : pathname !== "/menu-editorial" && !isProduct && !isCheckout && !isDeliveryAddress && !isDeliveryResult && !isPickup && !isPickupPoints && !isContact && !isAccount ? <Navigation /> : null}
              <CartPill />
            </>
          ) : null}
          {children}
        </SmoothScrollProvider>
      </CityProvider>
    </DraftProvider>
  );
}
