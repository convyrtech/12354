import { Suspense } from "react";
import { PickupPointsPage } from "@/components/pages/pickup-points-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PickupPointsPage />
    </Suspense>
  );
}
