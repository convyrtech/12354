import Link from "next/link";

export function PickupInfoPage() {
  return (
    <main className="cream-page">
      <div className="cream-page__shell">
        <p className="cream-page__eyebrow">Самовывоз</p>
        <h1 className="cream-page__title">Осоргино, 202</h1>
        <p className="cream-page__lead">
          Офис и раковарня в одном месте. Приезжайте — покажем
          производство, угостим кофе, соберём заказ при вас.
        </p>

        <section className="cream-page__section">
          <p className="cream-page__section-title">Часы работы</p>
          <p className="cream-page__section-value">Ежедневно, 10:00–21:00</p>
        </section>

        <section className="cream-page__section">
          <p className="cream-page__section-title">Адрес</p>
          <p className="cream-page__section-value">Осоргино, 202</p>
          <p className="cream-page__note">
            Точка выдачи совмещена с раковаркой. Если хотите посмотреть,
            как варим и упаковываем — приезжайте в любое удобное время.
          </p>
        </section>

        <Link href="/menu?fulfillment=pickup" className="cream-page__cta">
          Перейти в меню
        </Link>
      </div>
    </main>
  );
}

export default PickupInfoPage;
