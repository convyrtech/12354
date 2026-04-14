# Maps And Service UX

## Главный принцип

Карта должна остаться.

Но она должна работать как:

- `часть premium service UX`;
- `подтверждение адреса и контура`;
- `спокойный визуальный маркер сервиса`;

а не как:

- courier dashboard;
- dispatch screen;
- административная карта.

## Что зафиксировано для этой фазы

- реального backend-провайдера подключать не нужно;
- YUMA не подключаем;
- iiko не подключаем;
- paid provider wiring не является целью;
- карта и service routes остаются публичной частью сайта.

## Текущий подход, который можно использовать

Уже есть рабочая база:

- `MapLibre`
- `src/components/maps/delivery-maplibre-canvas.tsx`
- map style file: `public/map-styles/raki-investor-dark.json`
- static/mock route logic через `src/lib/fixtures.ts`
- delivery policy через `src/lib/delivery-policy.ts`
- timing truth через `src/lib/timing-policy.ts`

## Что использовать как карту в этой фазе

Рекомендуемый контур:

- оставить `MapLibre`;
- использовать текущий dark premium style как базу;
- можно визуально серьезно переработать presentation layer;
- зоны, кухня, destination pin, route line можно рендерить на fixture/static truth.

## Что НЕ делать сейчас

- не уходить в интеграцию с Yandex API;
- не строить новый routing backend;
- не тащить live quote provider;
- не превращать работу в geo-platform task.

## Как должен ощущаться delivery flow

### `/delivery/address`

- адресный сервис;
- тихая точность;
- дорогая карта;
- сильная верификация точки.

### `/delivery/result`

- спокойное подтверждение;
- зона / способ / ETA как service truth;
- premium reassurance вместо техничности.

## Минимальная service truth, которую надо сохранить

- address-first flow;
- подтвержденная точка;
- карта кухни и точки вручения;
- contour / zone idea;
- ETA / service window language;
- pickup fallback.

## Нынешняя бизнесовая подложка, которую можно отображать фронтендом

- активная точка: `Осоргино, 202`
- текущие сильные зоны:
  - `Центр Москвы`
  - `Рублёвка`
- будущая многоточечность есть в модели, но сейчас не должна перегружать интерфейс

## Практическое правило

Если выбор стоит между:

- красивой и правдоподобной premium map experience на mock/static truth;
- или долгой backend-integrations работе,

нужно выбирать первое.
