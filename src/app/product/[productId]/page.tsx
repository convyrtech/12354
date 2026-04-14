import { ProductPage } from "@/components/pages/product-page";

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ProductPage productId={productId} />;
}
