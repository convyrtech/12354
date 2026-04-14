import { Hero } from "@/components/sections/hero";
import { BrandProof } from "@/components/sections/brand-proof";
import { ProductTheatre } from "@/components/sections/product-theatre";
import { MenuEntry } from "@/components/sections/menu-entry";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <main data-home-stage="true" className="home-main">
      <Hero />
      <BrandProof />
      <ProductTheatre />
      <MenuEntry />
      <Footer />
    </main>
  );
}
