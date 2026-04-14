import { DeliveryResultPage } from "@/components/pages/delivery-result-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  return <DeliveryResultPage demoMode={params.demo === "investor"} />;
}
