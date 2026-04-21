export function resolvePublicSiteOrigin(
  explicitOrigin?: string | null,
): string | null {
  const candidate =
    explicitOrigin?.trim() ||
    process.env.SITE_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    null;

  if (!candidate) return null;
  return candidate.replace(/\/+$/, "");
}
