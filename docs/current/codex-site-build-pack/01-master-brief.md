# Master Brief

## Цель

Собрать `современный, смелый, премиальный публичный сайт The Raki`:

- с сильным брендовым входом;
- с полноценными публичными маршрутами;
- без реальных backend-интеграций;
- без подключения YUMA;
- без подключения iiko;
- с картами и service UX.

## Что это за сайт

Это не “сайт доставки еды”.

Это `премиальный digital flagship` бренда, внутри которого уже есть:

- homepage;
- каталог;
- товар;
- address-first delivery flow;
- pickup;
- корзина;
- checkout;
- post-order surface.

## Что это не такое

Не делать:

- investor demo;
- временный прототип;
- внутренний ops shell;
- нагромождение незавершенных фич ради “полноценной платформы”;
- страницу-однодневку без route architecture.

## Бизнесовая рамка

The Raki нужно ощущать как:

- premium private-service seafood/crayfish brand;
- delivery-first restaurant product;
- dark-kitchen-rooted business trajectory;
- дорогой, спокойный, собранный бренд Москвы.

Важно:

- внутренне проект может расти в delivery platform и dark-kitchen сеть;
- внешне публичный сайт не должен выглядеть как tech-panel или marketplace.

## Главные product truths

- ассортиментное ядро меню: `варёные`, `жарёные`, `живые` раки;
- supporting layer: креветки, краб, мидии, икра, подарки, напитки, частные поводы;
- size / recipe / weight / sauces — важная часть UX;
- address-first delivery — часть identity;
- карта — не декор, а часть service truth;
- homepage — flagship entry, но не весь сайт;
- homepage не должен раскладываться на блоки по `варёные / жарёные / живые`;
- категории и size/recipe logic принадлежат прежде всего `/menu` и `/product/[productId]`.

## Главные UX truths

- homepage создает желание и доверие;
- `/menu` — browsing surface;
- `/product/[productId]` — глубокая product page;
- `/delivery/address` и `/delivery/result` — красивый service UX с картой;
- `/cart` и `/checkout` — спокойный premium commerce;
- `/pickup/points` — честный отдельный сценарий, а не спрятанный fallback.

## Что разрешено в этой фазе

- mock data;
- local state;
- static or fixture-driven content;
- front-end-only submit behavior;
- front-end-only tracking state;
- map experience на статической / локальной логике.

## Что запрещено в этой фазе

- YUMA integration;
- iiko integration;
- реальный order transport;
- курьерский и ops-контур как основная цель;
- технический рефактор ради архитектурной красоты без прямого визуального результата.

## Definition of Done

Можно считать задачу выполненной, если:

- homepage выглядит как сильная premium работа, а не как шаблон;
- весь публичный маршрут ощущается одним брендом;
- карта и delivery flow работают визуально убедительно;
- сайт не выглядит как demo;
- build проходит;
- код остается в активном `src/`, без параллельного второго проекта.
