import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getLocation } from "@/lib/fixtures";
import { buildTwoGisHref, buildYandexMapsHref } from "@/lib/map-links";

const CONTACT_PHONE_LABEL = "+7 980 888-05-88";
const CONTACT_PHONE_HREF = "tel:+79808880588";
const CONTACT_TELEGRAM_LABEL = "@The_raki";
const CONTACT_TELEGRAM_HREF = "https://t.me/The_raki";
const PICKUP_LOCATION_ID = "loc_lesnoy_01";

export function ContactPage() {
  const pickupLocation = getLocation(PICKUP_LOCATION_ID);
  const pickupAddress = pickupLocation?.addressLabel ?? "Осоргино, 202";
  const pickupHours = pickupLocation?.operatingHours
    ? `${pickupLocation.operatingHours.open}–${pickupLocation.operatingHours.close}`
    : "12:00–23:00";

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
    <main className="public-editorial public-editorial--contact">
      <div className="menu-editorial__controls public-editorial__controls">
        <Link href="/" className="menu-editorial__control menu-editorial__control--menu">
          <span className="product-editorial__back-arrow" aria-hidden>
            ←
          </span>
          <span>Главная</span>
        </Link>

        <div className="menu-editorial__control-stack">
          <Link href="/menu-editorial" className="menu-editorial__control">
            <span>Меню</span>
          </Link>
          <Link href="/account" className="menu-editorial__control">
            <span>Кабинет</span>
          </Link>
        </div>
      </div>

      <section className="public-editorial__hero">
        <div className="public-editorial__hero-inner">
          <div className="public-editorial__hero-grid">
            <ScrollReveal>
              <div className="public-editorial__copy">
                <span className="public-editorial__brand">The Raki</span>
                <span className="public-editorial__eyebrow">Связь</span>
                <h1 className="public-editorial__title">Позвоните, напишите, заезжайте.</h1>
                <p className="public-editorial__lead">
                  Для заказа, частного стола и особых запросов лучше выйти на нас напрямую.
                </p>

                <div className="public-editorial__hero-meta">
                  <div className="public-editorial__hero-stat">
                    <span className="public-editorial__label">Телефон</span>
                    <strong>{CONTACT_PHONE_LABEL}</strong>
                    <span>ежедневно</span>
                  </div>

                  <div className="public-editorial__hero-stat">
                    <span className="public-editorial__label">Telegram</span>
                    <strong>{CONTACT_TELEGRAM_LABEL}</strong>
                    <span>отвечаем лично</span>
                  </div>

                  <div className="public-editorial__hero-stat">
                    <span className="public-editorial__label">Точка</span>
                    <strong>{pickupAddress}</strong>
                    <span>{pickupHours}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.06}>
              <aside className="public-editorial__sidecard">
                <span className="public-editorial__panel-eyebrow">На связи</span>
                <h2 className="public-editorial__panel-title">{CONTACT_PHONE_LABEL}</h2>
                <p className="public-editorial__panel-copy">
                  Telegram, звонок или личный визит в Осоргино.
                </p>

                <div className="public-editorial__panel-grid">
                  <div className="public-editorial__panel-row">
                    <span>Telegram</span>
                    <strong>{CONTACT_TELEGRAM_LABEL}</strong>
                  </div>
                  <div className="public-editorial__panel-row">
                    <span>Адрес</span>
                    <strong>{pickupAddress}</strong>
                  </div>
                  <div className="public-editorial__panel-row">
                    <span>Часы</span>
                    <strong>{pickupHours}</strong>
                  </div>
                </div>

                <div className="public-editorial__panel-actions">
                  <a href={CONTACT_PHONE_HREF} className="public-editorial__primary-action">
                    Позвонить
                  </a>
                  <a
                    href={CONTACT_TELEGRAM_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="public-editorial__secondary-action"
                  >
                    Telegram
                  </a>
                </div>
              </aside>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="public-editorial__workbench">
        <div className="public-editorial__workbench-inner">
          <ScrollReveal className="public-editorial__summary-shell">
            <aside className="public-editorial__summary">
              <span className="public-editorial__label">Контакты</span>
              <h2 className="public-editorial__summary-title">{pickupAddress}</h2>

              <div className="public-editorial__summary-block">
                <span className="public-editorial__label">Сейчас</span>
                <strong>{pickupHours}</strong>
                <p>{CONTACT_PHONE_LABEL}</p>
              </div>

              <div className="public-editorial__summary-grid">
                <div className="public-editorial__summary-row">
                  <span>Телефон</span>
                  <strong>{CONTACT_PHONE_LABEL}</strong>
                </div>
                <div className="public-editorial__summary-row">
                  <span>Telegram</span>
                  <strong>{CONTACT_TELEGRAM_LABEL}</strong>
                </div>
                <div className="public-editorial__summary-row">
                  <span>Навигация</span>
                  <strong>Яндекс · 2GIS</strong>
                </div>
              </div>

              <div className="public-editorial__summary-actions">
                <a href={CONTACT_PHONE_HREF} className="public-editorial__primary-action">
                  Позвонить
                </a>
                <a
                  href={CONTACT_TELEGRAM_HREF}
                  target="_blank"
                  rel="noreferrer"
                  className="public-editorial__secondary-action"
                >
                  Telegram
                </a>
              </div>
            </aside>
          </ScrollReveal>

          <div className="public-editorial__content">
            <ScrollReveal delay={0.06}>
              <section className="public-editorial__section">
                <div className="public-editorial__section-head">
                  <div>
                    <span className="public-editorial__label">Связь</span>
                    <h2>Как удобнее выйти на нас</h2>
                  </div>
                </div>

                <div className="public-editorial__detail-grid">
                  <div className="public-editorial__detail-row">
                    <span>Телефон</span>
                    <strong>
                      <a href={CONTACT_PHONE_HREF}>{CONTACT_PHONE_LABEL}</a>
                    </strong>
                  </div>
                  <div className="public-editorial__detail-row">
                    <span>Telegram</span>
                    <strong>
                      <a href={CONTACT_TELEGRAM_HREF} target="_blank" rel="noreferrer">
                        {CONTACT_TELEGRAM_LABEL}
                      </a>
                    </strong>
                  </div>
                  <div className="public-editorial__detail-row">
                    <span>Адрес</span>
                    <strong>{pickupAddress}</strong>
                  </div>
                  <div className="public-editorial__detail-row">
                    <span>Навигатор</span>
                    <strong>
                      <a href={yandexMapsHref} target="_blank" rel="noreferrer">
                        Яндекс
                      </a>
                      {" · "}
                      <a href={twoGisHref} target="_blank" rel="noreferrer">
                        2GIS
                      </a>
                    </strong>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <section className="public-editorial__section public-editorial__section--quiet">
                <div className="public-editorial__section-head">
                  <div>
                    <span className="public-editorial__label">Запросы</span>
                    <h2>Частные столы, мероприятия, B2B</h2>
                  </div>
                </div>

                <div className="public-editorial__detail-grid">
                  <div className="public-editorial__detail-row">
                    <span>Частный стол</span>
                    <strong>согласуем лично</strong>
                  </div>
                  <div className="public-editorial__detail-row">
                    <span>Мероприятие</span>
                    <strong>обсудим формат и логистику</strong>
                  </div>
                  <div className="public-editorial__detail-row">
                    <span>B2B</span>
                    <strong>отвечаем напрямую</strong>
                  </div>
                  <div className="public-editorial__detail-row">
                    <span>Самовывоз</span>
                    <strong>{pickupAddress}</strong>
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

export default ContactPage;
