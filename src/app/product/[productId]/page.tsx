import { ProductPage } from "@/components/pages/product-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { productId } = await params;
  const { from } = await searchParams;
  return <ProductPage productId={productId} origin={from === "editorial" ? "editorial" : "menu"} />;
}
