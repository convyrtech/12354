import Image from "next/image";
import { QUALITY_PROOF } from "@/lib/homepage-data";

export function BrandProof() {
  return (
    <section
      id="quality"
      className="home-section manifesto-section"
      style={{ paddingBottom: "clamp(108px, 12vw, 176px)", scrollMarginTop: 120 }}
    >
      <div className="home-shell">
        <div className="manifesto-block">
          <span className="text-eyebrow">{QUALITY_PROOF.eyebrow}</span>

          <p className="manifesto-text">
            {QUALITY_PROOF.lead}{" "}
            <em className="manifesto-italic">{QUALITY_PROOF.italic}</em>{" "}
            {QUALITY_PROOF.tail}
          </p>

          <div className="manifesto-aside">
            <Image
              src={QUALITY_PROOF.image}
              alt="The Raki — философия"
              fill
              sizes="(max-width: 1279px) 100vw, 40vw"
              style={{ objectFit: "cover", objectPosition: "50% 50%" }}
            />
            <div className="manifesto-aside__veil" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
