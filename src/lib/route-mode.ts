export type RouteMode = "public" | "demo";

export function isInvestorDemoMode(pathname: string, demoParam?: string | null) {
  return (
    demoParam === "investor" ||
    pathname === "/demo" ||
    pathname.startsWith("/investor-demo") ||
    pathname === "/track/investor-demo"
  );
}

export function getRouteMode(pathname: string, demoParam?: string | null): RouteMode {
  return isInvestorDemoMode(pathname, demoParam) ? "demo" : "public";
}
