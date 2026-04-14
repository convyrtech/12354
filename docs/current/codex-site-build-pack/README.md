# Codex Site Build Pack

Дата: `2026-04-09`

## Что это

Это изолированный рабочий пакет для Codex, чтобы быстро и без путаницы собирать `публичный премиальный сайт The Raki`:

- не investor demo;
- не ops-систему;
- не backend-интеграционный контур;
- не голый лендинг без маршрутов.

Правильная рамка:

- `полноценный публичный сайт`;
- `без подключения YUMA / iiko / реального order backend`;
- `с картами и premium service UX`;
- `с сильной homepage как flagship entry`;
- `с маршрутами menu / product / delivery / pickup / cart / checkout`.

## Что читать в первую очередь

1. `00-codex-operating-contract.md`
2. `01-master-brief.md`
3. `02-routes-and-page-jobs.md`
4. `03b-contacts-and-footer-truth.md`
5. `05-maps-and-service-ux.md`
6. `06-visual-direction-and-rules.md`
7. `07-implementation-boundaries.md`
8. `08-codex-implementation-prompt.md`
9. `15-one-message-launch-instruction.md`

## Файлы, которые усиливают taste control

Если нужно повысить шанс именно сильного визуального результата, а не просто “аккуратной реализации”, обязательно использовать:

- `16-visual-references.md`
- `17-non-negotiables.md`
- `18-success-criteria-by-route.md`
- `19-art-direction-choices.md`

## Главный документ для Codex

Если давать Codex один основной operational файл, это:

- `00-codex-operating-contract.md`

Он важнее красивых формулировок в prompt, потому что фиксирует:

- scope;
- порядок работы;
- decision rules;
- content boundaries;
- definition of done.

## Что зафиксировано

- проект теперь трактуется как `публичный брендовый сайт`, а не как demo/investor-пак;
- homepage должна быть очень сильной, но сайт не сводится к одной homepage;
- routes важны и остаются частью продукта;
- backend-интеграции сейчас не цель;
- карта и сервисный UX важны и должны остаться.

## Что сознательно вынесено из активного контекста

Не использовать как рабочую рамку:

- `demo`
- `investor-demo`
- `ops`
- `courier`
- `api`
- `source/` как legacy-дубль
- runtime-логи, `.next`, `output`, `data/orders`, temp-файлы

## Что должно получиться

Codex должен по этому пакету собрать:

- сильную homepage;
- цельный визуальный язык на всех публичных маршрутах;
- premium browsing и product experience;
- premium map-driven service flow;
- cart / checkout без backend, но с ощущением реального продукта.

## Базовые канонические файлы в коде

Если нужно лезть глубже, первыми смотреть:

- `src/app/page.tsx`
- `src/app/menu/page.tsx`
- `src/app/product/[productId]/page.tsx`
- `src/app/delivery/address/page.tsx`
- `src/app/delivery/result/page.tsx`
- `src/app/pickup/points/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/track/[token]/page.tsx`
- `src/components/pages/*`
- `src/components/sections/*`
- `src/components/maps/delivery-maplibre-canvas.tsx`
- `src/components/navigation.tsx`
- `src/components/draft-provider.tsx`
- `src/components/cart-pill.tsx`
- `src/lib/homepage-data.ts`
- `src/lib/fixtures.ts`
- `src/lib/delivery-policy.ts`
- `src/lib/timing-policy.ts`
- `src/app/globals.css`
