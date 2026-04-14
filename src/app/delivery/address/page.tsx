import { Suspense } from "react";
import { DeliveryAddressPage } from "@/components/pages/delivery-address-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DeliveryAddressPage />
    </Suspense>
  );
}
