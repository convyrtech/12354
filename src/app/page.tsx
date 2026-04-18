import { Hero } from "@/components/sections/hero";
import { AquariumToTable } from "@/components/sections/aquarium-to-table";
import { BrandStory } from "@/components/sections/brand-story";
import { BrandProof } from "@/components/sections/brand-proof";
import { ProductTheatre } from "@/components/sections/product-theatre";
import { MenuEntry } from "@/components/sections/menu-entry";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    // Perspective lives on this wrapper only — NOT on html/body/panel.
    // HomeMenu (panel + trigger + overlay) is rendered as a sibling in
    // AppProviders, outside this wrapper, so panel layout stays unaffected.
    <div className="perspective-wrapper">
      <main data-home-stage="true" className="home-main">
        <AquariumToTable>
          <Hero />
        </AquariumToTable>
        <BrandStory />
        <BrandProof />
        <ProductTheatre />
        <MenuEntry />
        <Footer />
      </main>
    </div>
  );
}
