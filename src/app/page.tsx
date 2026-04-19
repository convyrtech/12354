import { Hero } from "@/components/sections/hero";
import { AquariumToTable } from "@/components/sections/aquarium-to-table";
import { BrandStory } from "@/components/sections/brand-story";
import { TrustedBy } from "@/components/sections/trusted-by";
import { MenuEntry } from "@/components/sections/menu-entry";

export default function Home() {
  return (
    // Perspective lives on this wrapper only — NOT on html/body/panel.
    // HomeMenu (panel + trigger + overlay) is rendered as a sibling in
    // AppProviders, outside this wrapper, so panel layout stays unaffected.
    //
    // MenuEntry is the final section — it carries the cream "finale card"
    // with CTA, info columns, and wordmark (the old Footer was folded in).
    <div className="perspective-wrapper">
      <main data-home-stage="true" className="home-main">
        <AquariumToTable>
          <Hero />
        </AquariumToTable>
        <BrandStory />
        <TrustedBy />
        <MenuEntry />
      </main>
    </div>
  );
}
