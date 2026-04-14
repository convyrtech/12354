import Image from "next/image";
import { PRODUCT_THEATRE } from "@/lib/homepage-data";

export function ProductTheatre() {
  return (
    <section
      id="product"
      className="home-section experience-section"
      style={{ paddingBottom: "clamp(108px, 12vw, 176px)" }}
    >
      <div className="home-shell">
        <div className="home-divider" style={{ marginBottom: "clamp(48px, 6vw, 84px)" }} />

        <div className="experience-block">
          <div className="experience-block__media">
            <Image
              src={PRODUCT_THEATRE.image}
              alt="The Raki — опыт и доверие"
              fill
              sizes="(max-width: 1279px) 100vw, 58vw"
              style={{
                objectFit: "cover",
                objectPosition: "50% 52%",
              }}
            />
            <div className="experience-block__veil" aria-hidden />
          </div>

          <div className="experience-block__copy">
            <span className="text-eyebrow">{PRODUCT_THEATRE.eyebrow}</span>
            <p className="experience-text">
              {PRODUCT_THEATRE.lead}{" "}
              <em className="experience-italic">{PRODUCT_THEATRE.italic}</em>{" "}
              {PRODUCT_THEATRE.tail}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
