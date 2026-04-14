# Implementation Boundaries

## Главная рамка

Codex должен работать в активном приложении, а не создавать вторую параллельную систему.

## Что можно редактировать в первую очередь

### Public app routes

- `src/app/page.tsx`
- `src/app/menu/page.tsx`
- `src/app/product/[productId]/page.tsx`
- `src/app/delivery/address/page.tsx`
- `src/app/delivery/result/page.tsx`
- `src/app/pickup/points/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/track/[token]/page.tsx`

### Public route components

- `src/components/pages/menu-page.tsx`
- `src/components/pages/product-page.tsx`
- `src/components/pages/delivery-address-page.tsx`
- `src/components/pages/delivery-result-page.tsx`
- `src/components/pages/pickup-points-page.tsx`
- `src/components/pages/cart-page.tsx`
- `src/components/pages/checkout-page.tsx`
- `src/components/tracking/public-tracking-page.tsx`

### Homepage sections

- `src/components/sections/hero.tsx`
- `src/components/sections/brand-proof.tsx`
- `src/components/sections/product-theatre.tsx`
- `src/components/sections/service-strip.tsx`
- `src/components/sections/menu-entry.tsx`
- `src/components/sections/extensions-section.tsx`
- `src/components/sections/footer.tsx`

### Shared presentation layer

- `src/components/navigation.tsx`
- `src/components/cart-pill.tsx`
- `src/components/draft-provider.tsx`
- `src/components/maps/delivery-maplibre-canvas.tsx`
- `src/app/globals.css`

### Data / content truth

- `src/lib/homepage-data.ts`
- `src/lib/fixtures.ts`
- `src/lib/delivery-policy.ts`
- `src/lib/timing-policy.ts`

## Что не является активной целью

- `src/app/api/*`
- `src/app/ops/*`
- `src/app/courier/*`
- `src/app/demo/*`
- `src/app/investor-demo/*`
- `src/components/pages/investor-demo-page.tsx`
- `src/server/*`
- `source/*`

## Что не подключать

- YUMA
- iiko
- реальную платежную интеграцию
- реальный order transport
- реальный courier loop
- реальный backend submit

## Что допустимо вместо этого

- local state;
- fixture-driven data;
- mock submit;
- mock tracking;
- static zones;
- front-end-only service flow.

## Технологический контур

Текущий активный стек:

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Framer Motion`
- `MapLibre`

Добавлять тяжелые новые зависимости стоит только если они реально поднимают публичный результат.

## Публичная лексика

Нужно убрать или не тащить в публичную часть:

- demo wording;
- investor wording;
- prototype wording;
- ops/admin vocabulary;
- избыточный internal/system language.

## Проверка результата

Минимум:

- `npm run build`

Желательно:

- визуальная проверка `/`, `/menu`, `/product/[productId]`, `/delivery/address`, `/delivery/result`, `/cart`, `/checkout`

## Практический принцип

Если есть выбор между:

- глубоким инфраструктурным улучшением;
- и сильным скачком в публичном визуальном и UX-качестве,

в этой фазе нужно выбирать второе.
