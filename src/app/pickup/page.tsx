import { PickupInfoPage } from "@/components/pages/pickup-info-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  return <PickupInfoPage demoMode={params.demo === "investor"} />;
}
