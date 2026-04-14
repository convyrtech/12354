import { Suspense } from "react";
import { CourierLoginPage } from "@/components/courier";

export default function CourierLoginRoute() {
  return (
    <Suspense fallback={null}>
      <CourierLoginPage />
    </Suspense>
  );
}
