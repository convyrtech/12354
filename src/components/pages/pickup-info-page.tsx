import Link from "next/link";
import { PickupMaplibreCanvas } from "@/components/maps/pickup-maplibre-canvas";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getLocation } from "@/lib/fixtures";
import { buildTwoGisHref, buildYandexMapsHref } from "@/lib/map-links";

const PICKUP_LOCATION_ID = "loc_lesnoy_01";

export function PickupInfoPage({ demoMode = false }: { demoMode?: boolean }) {
  const pickupLocation = getLocation(PICKUP_LOCATION_ID);
  const pickupTitle = pickupLocation?.name ?? "Осоргино, 202";
  const pickupAddress = pickupLocation?.addressLabel ?? pickupTitle;
  const pickupHours = pickupLocation?.operatingHours
    ? `${pickupLocation.operatingHours.open}–${pickupLocation.operatingHours.close}`
    : "12:00–23:00";
  const demoSuffix = demoMode ? "?demo=investor" : "";
  const pickupPointsHref = `/pickup/points${demoSuffix}`;
  const deliveryHref = `/delivery/address${demoSuffix}`;

  const yandexMapsHref = buildYandexMapsHref({
    label: pickupAddress,
    lat: pickupLocation?.lat ?? null,
    lng: pickupLocation?.lng ?? null,
  });
  const twoGisHref = buildTwoGisHref({
    label: pickupAddress,
    lat: pickupLocation?.lat ?? null,
    lng: pickupLocation?.lng ?? null,
  });

  return (
    <main className="pickup-entry">
      <div className="menu-editorial__controls pickup-entry__controls">
        <Link href="/" className="menu-editorial__control menu-editorial__control--menu">
          <span className="product-editorial__back-arrow" aria-hidden>
            ←
          </span>
          <span>Главная</span>
        </Link>

        <div className="menu-editorial__control-stack">
          <Link href={deliveryHref} className="menu-editorial__control">
            <span>Доставка</span>
          </Link>
        </div>
      </div>

      <section className="pickup-entry__hero">
        <div className="pickup-entry__hero-overlay" />

        <div className="pickup-entry__hero-inner">
          <div className="pickup-entry__hero-grid">
            <ScrollReveal>
              <div className="pickup-entry__hero-copy">
                <span className="pickup-entry__brand">The Raki</span>
                <span className="pickup-entry__eyebrow">Самовывоз</span>
                <h1 className="pickup-entry__title">{pickupTitle}</h1>
                <p className="pickup-entry__lead">Заберите заказ из активной кухни.</p>

                <div className="pickup-entry__hero-meta">
                  <div className="pickup-entry__hero-stat">
                    <span className="pickup-entry__label">Часы</span>
                    <strong>{pickupHours}</strong>
                    <span>ежедневно</span>
                  </div>

                  <div className="pickup-entry__hero-stat">
                    <span className="pickup-entry__label">Режим</span>
                    <strong>Самовывоз</strong>
                    <span>активная кухня</span>
                  </div>

                  <div className="pickup-entry__hero-stat">
                    <span className="pickup-entry__label">Адрес</span>
                    <strong>{pickupAddress}</strong>
                    <span>точка выдачи</span>
                  </div>
                </div>

                <div className="pickup-entry__hero-actions">
                  <Link href={pickupPointsHref} className="pickup-entry__submit">
                    Выбрать окно
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.06}>
              <div className="pickup-entry__map-shell">
                <div className="pickup-entry__map-surface">
                  <PickupMaplibreCanvas
                    lat={pickupLocation?.lat ?? null}
                    lng={pickupLocation?.lng ?? null}
                    label={pickupTitle}
                    address={pickupAddress}
                  />

                  <div className="pickup-entry__map-card">
                    <span className="pickup-entry__label">Точка</span>
                    <strong>{pickupTitle}</strong>
                    <p>{pickupAddress}</p>

                    <div className="pickup-entry__map-links">
                      <a href={yandexMapsHref} rel="noreferrer" target="_blank" className="pickup-entry__map-link">
                        Яндекс
                      </a>
                      <a href={twoGisHref} rel="noreferrer" target="_blank" className="pickup-entry__map-link">
                        2GIS
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="pickup-entry__workbench">
        <div className="pickup-entry__workbench-inner">
          <ScrollReveal className="pickup-entry__summary-shell">
            <aside className="pickup-entry__summary">
              <span className="pickup-entry__label">Самовывоз</span>
              <h2 className="pickup-entry__summary-title">{pickupTitle}</h2>

              <div className="pickup-entry__summary-block">
                <span className="pickup-entry__label">Сейчас</span>
                <strong>Кухня активна</strong>
                <p>{pickupHours}</p>
              </div>

                <div className="pickup-entry__summary-grid">
                  <div className="pickup-entry__summary-row">
                    <span>Режим</span>
                    <strong>самовывоз</strong>
                  </div>
                <div className="pickup-entry__summary-row">
                  <span>Оплата</span>
                  <strong>карта, наличные, перевод</strong>
                </div>
                  <div className="pickup-entry__summary-row">
                    <span>Точка</span>
                    <strong>{pickupAddress}</strong>
                  </div>
                </div>

              <div className="pickup-entry__summary-actions">
                <Link href={pickupPointsHref} className="pickup-entry__submit">
                  Выбрать окно
                </Link>
                <Link href={deliveryHref} className="pickup-entry__secondary-action">
                  Доставка
                </Link>
              </div>
            </aside>
          </ScrollReveal>

          <div className="pickup-entry__content">
            <ScrollReveal delay={0.06}>
              <section className="pickup-entry__section">
                <div className="pickup-entry__section-head">
                  <div>
                    <span className="pickup-entry__label">Точка</span>
                    <h2>{pickupTitle}</h2>
                  </div>
                </div>

                <div className="pickup-entry__detail-grid">
                  <div className="pickup-entry__detail-row">
                    <span>Адрес</span>
                    <strong>{pickupAddress}</strong>
                  </div>
                  <div className="pickup-entry__detail-row">
                    <span>Часы</span>
                    <strong>{pickupHours}</strong>
                  </div>
                  <div className="pickup-entry__detail-row">
                    <span>Навигатор</span>
                    <strong>
                      <a href={yandexMapsHref} rel="noreferrer" target="_blank">
                        Яндекс
                      </a>
                      {" · "}
                      <a href={twoGisHref} rel="noreferrer" target="_blank">
                        2GIS
                      </a>
                    </strong>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <section className="pickup-entry__section pickup-entry__section--quiet">
                <div className="pickup-entry__section-head">
                  <div>
                    <span className="pickup-entry__label">На месте</span>
                    <h2>К выдаче</h2>
                  </div>
                </div>

                <div className="pickup-entry__detail-grid">
                  <div className="pickup-entry__detail-row">
                    <span>Точка</span>
                    <strong>выдача с кухни</strong>
                  </div>
                  <div className="pickup-entry__detail-row">
                    <span>Сборка</span>
                    <strong>по выбранному окну</strong>
                  </div>
                  <div className="pickup-entry__detail-row">
                    <span>Дальше</span>
                    <strong>меню после выбора окна</strong>
                  </div>
                </div>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PickupInfoPage;
