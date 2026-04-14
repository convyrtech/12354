import { PublicTrackingPage } from "@/components/tracking";

export default async function PublicTrackingRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicTrackingPage token={token} />;
}
