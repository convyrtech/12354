"use client";

import Link from "next/link";

type DemoRoute = {
  step: string;
  title: string;
  href: string;
  note: string;
  span?: number;
};

const ENTRY_ROUTES: readonly DemoRoute[] = [
  {
    step: "A",
    title: "Открыть чистый сайт",
    href: "/",
    note: "Главная без служебных подсказок и внутренних комментариев.",
  },
  {
    step: "B",
    title: "Открыть собранный путь",
    href: "/?demo=investor",
    note: "Собранный путь от главной до подтверждения заказа.",
  },
  {
    step: "C",
    title: "Начать с адреса",
    href: "/delivery/address",
    note: "Если нужно сразу показать подтверждение сервиса по адресу.",
  },
] as const;

const GUIDED_ROUTES: readonly DemoRoute[] = [
  {
    step: "01",
    title: "Главная",
    href: "/?demo=investor",
    note: "Первый экран, тон бренда и частного сервиса.",
    span: 6,
  },
  {
    step: "02",
    title: "Подтверждение по адресу",
    href: "/delivery/result?demo=investor",
    note: "Спокойное подтверждение маршрута и окна обслуживания.",
    span: 6,
  },
  {
    step: "03",
    title: "Каталог",
    href: "/menu?demo=investor",
    note: "Ассортимент уже под выбранный адрес и формат обслуживания.",
    span: 4,
  },
  {
    step: "04",
    title: "Товар",
    href: "/product/item_crayfish_boiled?demo=investor",
    note: "Вес, рецепт, размер и спокойные допродажи.",
    span: 4,
  },
  {
    step: "05",
    title: "Оформление",
    href: "/checkout?demo=investor",
    note: "Контакт, подтверждение и передача заказа команде.",
    span: 4,
  },
  {
    step: "06",
    title: "Сопровождение",
    href: "/track/investor-demo",
    note: "Публичный статус после подтверждения заказа.",
    span: 6,
  },
  {
    step: "07",
    title: "Самовывоз",
    href: "/pickup/points?demo=investor",
    note: "Отдельный путь выдачи без подмены доставки.",
    span: 6,
  },
] as const;

function EntryCard({ route }: { route: DemoRoute }) {
  return (
    <Link
      href={route.href}
      style={{
        padding: "calc(var(--space-lg) + 2px)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background:
          "radial-gradient(circle at top left, rgba(99, 188, 197, 0.08) 0%, rgba(99, 188, 197, 0) 42%), rgba(10, 18, 24, 0.84)",
        display: "grid",
        gap: "var(--space-xs)",
        alignContent: "space-between",
        minHeight: 164,
      }}
    >
      <div>
        <div
          className="flex items-center justify-between"
          style={{ gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}
        >
          <span className="text-eyebrow">{route.step}</span>
          <span className="text-eyebrow" style={{ color: "var(--accent)" }}>
            Старт
          </span>
        </div>
        <strong
          style={{
            display: "block",
            fontSize: 25,
            lineHeight: 1.08,
            marginBottom: "var(--space-xs)",
            fontFamily: "var(--font-display), serif",
          }}
        >
          {route.title}
        </strong>
        <div className="text-muted" style={{ lineHeight: 1.65, fontSize: 14 }}>
          {route.note}
        </div>
      </div>
      <span className="cta cta--ghost" style={{ padding: 0, border: "none", justifyContent: "flex-start" }}>
        Открыть →
      </span>
    </Link>
  );
}

function RouteCard({ route }: { route: DemoRoute }) {
  return (
    <Link
      href={route.href}
      style={{
        gridColumn: `span ${route.span ?? 4}`,
        minHeight: 208,
        padding: "var(--space-lg)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background:
          "radial-gradient(circle at top left, rgba(99, 188, 197, 0.08) 0%, rgba(99, 188, 197, 0) 42%), rgba(10, 18, 24, 0.84)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          className="flex items-center justify-between"
          style={{ gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}
        >
          <span className="text-eyebrow">{route.step}</span>
          <span className="text-eyebrow" style={{ color: "var(--accent)" }}>
            Путь
          </span>
        </div>
        <strong
          style={{
            display: "block",
            fontSize: route.span && route.span >= 6 ? 32 : 26,
            lineHeight: 1.08,
            marginBottom: "var(--space-sm)",
            fontFamily: "var(--font-display), serif",
          }}
        >
          {route.title}
        </strong>
        <div
          className="text-muted"
          style={{ lineHeight: 1.8, maxWidth: route.span && route.span >= 6 ? 420 : 340 }}
        >
          {route.note}
        </div>
      </div>
      <span className="cta cta--ghost" style={{ padding: 0, border: "none", justifyContent: "flex-start" }}>
        Открыть →
      </span>
    </Link>
  );
}

export function InvestorDemoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 1320,
        margin: "0 auto",
        padding: "116px var(--space-lg) var(--space-xl)",
      }}
    >
      <section
        style={{
          padding: "calc(var(--space-xl) + 4px)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border)",
          background:
            "radial-gradient(circle at top left, rgba(99, 188, 197, 0.08) 0%, rgba(99, 188, 197, 0) 44%), rgba(10, 18, 24, 0.84)",
          marginBottom: "var(--space-sm)",
        }}
      >
        <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
          Режим показа
        </span>
        <h1 className="text-h2" style={{ marginBottom: "var(--space-xs)", maxWidth: 720 }}>
          Открыть сайт или пройти уже собранный путь.
        </h1>
        <p
          className="text-muted"
          style={{ maxWidth: 620, lineHeight: 1.75, fontSize: 15, marginBottom: "var(--space-md)" }}
        >
          Здесь только быстрые входы без внутренней кухни и лишних объяснений.
        </p>
        <div className="flex" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <Link href="/" className="cta cta--primary">
            Открыть чистый сайт
          </Link>
          <Link href="/?demo=investor" className="cta cta--ghost">
            Открыть собранный путь
          </Link>
        </div>
      </section>

      <section style={{ marginBottom: "var(--space-sm)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--space-sm)" }}>
          {ENTRY_ROUTES.map((route) => (
            <EntryCard key={route.href} route={route} />
          ))}
        </div>
      </section>

      <section>
        <div style={{ marginBottom: "var(--space-sm)" }}>
          <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
            Путь показа
          </span>
          <h2 className="text-h2">Главные экраны в одном месте.</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            gap: "var(--space-sm)",
          }}
        >
          {GUIDED_ROUTES.map((route) => (
            <RouteCard key={route.href} route={route} />
          ))}
        </div>
      </section>
    </div>
  );
}
