// Delivery pages load MapLibre tiles from OpenFreeMap and fetch the brand
// map style. Opening a TLS connection to the tile CDN before bundle boot
// saves ~100-300 ms off first-tile render. The style JSON prefetch eats
// the round-trip even before the canvas mounts.
//
// preconnect/prefetch are scoped to the /delivery route group so pages
// like /menu or / do not carry the cost.
export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        rel="preconnect"
        href="https://tiles.openfreemap.org"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
      <link
        rel="prefetch"
        href="/map-styles/raki-investor-dark.json"
        as="fetch"
        crossOrigin="anonymous"
      />
      {children}
    </>
  );
}
