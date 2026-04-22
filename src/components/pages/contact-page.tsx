import { BodySurfaceTag } from "@/components/shared/body-surface-tag";

export function ContactPage() {
  return (
    <main className="cream-page">
      <BodySurfaceTag surface="cream" />
      <div className="cream-page__shell">
        <p className="cream-page__eyebrow">Связь</p>
        <h1 className="cream-page__title">Звоните, пишите, заезжайте.</h1>

        <section className="cream-page__section">
          <p className="cream-page__section-title">Телефон</p>
          <p className="cream-page__section-value">
            <a href="tel:+79808880588">+7 980 888-05-88</a>
          </p>
        </section>

        <section className="cream-page__section">
          <p className="cream-page__section-title">Telegram</p>
          <p className="cream-page__section-value">
            <a
              href="https://t.me/The_raki"
              target="_blank"
              rel="noopener noreferrer"
            >
              @The_raki
            </a>
          </p>
        </section>

        <section className="cream-page__section">
          <p className="cream-page__section-title">Адрес</p>
          <p className="cream-page__section-value">Осоргино, 202</p>
          <p className="cream-page__note">
            Приезжайте обсудить спецзаказ или мероприятие. Офис работает
            в те же часы, что и раковарня.
          </p>
        </section>

        <section className="cream-page__section">
          <p className="cream-page__section-title">Особые запросы</p>
          <p className="cream-page__note">
            Для мероприятий, B2B-заказов и особых запросов пишите
            в Telegram — ответим лично, согласуем формат, команду шефа
            и логистику.
          </p>
        </section>
      </div>
    </main>
  );
}

export default ContactPage;
