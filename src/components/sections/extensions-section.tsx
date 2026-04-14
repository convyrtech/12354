import Link from "next/link";
import { HOME_CONTACT_LINES } from "@/lib/homepage-data";

export function ExtensionsSection() {
  return (
    <section
      id="contact"
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "0 var(--space-lg) var(--space-2xl)",
        scrollMarginTop: 120,
      }}
    >
      <div
        className="home-panel grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]"
        style={{
          padding: "clamp(26px, 4vw, 40px)",
          borderRadius: 40,
          background:
            "linear-gradient(135deg, rgba(255,250,244,0.84) 0%, rgba(235,223,209,0.74) 100%)",
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <span className="text-eyebrow">Контакт</span>
          <h2 className="text-h1" style={{ marginTop: 18, marginBottom: 18 }}>
            Заказать, подарить,
            <br />
            собрать большой стол.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/menu?fulfillment=delivery" className="cta cta--primary">
              Открыть каталог
            </Link>
            <Link href="/delivery/address" className="cta cta--secondary">
              Доставка
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          {HOME_CONTACT_LINES.map((line) => (
            <Link
              key={line.label}
              href={line.href}
              target={line.href.startsWith("http") ? "_blank" : undefined}
              rel={line.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="home-metric"
              style={{ display: "grid", gap: 8 }}
            >
              <span className="text-eyebrow">{line.label}</span>
              <strong className="text-h3">{line.value}</strong>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
