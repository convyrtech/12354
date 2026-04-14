# Routes And Page Jobs

## Публичные маршруты, которые должны остаться

### `/`

Роль:

- главный брендовый вход;
- эмоциональное и коммерческое лицо проекта;
- strongest flagship route.

Что должен делать:

- вводить в бренд;
- показывать мир бренда и уровень сервиса, а не раскладку по категориям;
- доказывать реальность и качество;
- мягко уводить в каталог и delivery flow.

### `/menu`

Роль:

- основная browsing surface;
- не homepage 2.0;
- не marketplace grid.

Что должен делать:

- давать понятную и красивую навигацию по ассортименту;
- выделять key product groups;
- поддерживать premium browsing rhythm;
- вести в `/product/[productId]` и быстрые сценарии добавления.

### `/product/[productId]`

Роль:

- глубокая product page;
- место силы для сложного выбора.

Что должен делать:

- продавать продукт;
- показывать размер, рецепт, вес, добавки;
- ощущаться как premium product page, а не configurator report.

### `/delivery/address`

Роль:

- address-first вход в delivery service UX;
- route, где карта имеет смысл.

Что должен делать:

- принимать адрес;
- подтверждать точку;
- показывать карту, контур, destination pin;
- ощущаться как curated premium service flow.

### `/delivery/result`

Роль:

- подтверждение сервисного сценария после адреса;
- calm service decision page.

Что должен делать:

- показывать доступность;
- показывать карту и service truth;
- вести либо в `/menu`, либо в pickup fallback.

### `/pickup/points`

Роль:

- отдельный route для самовывоза;
- не скрытый технический fallback.

Что должен делать:

- показывать точку/точки;
- давать честный pickup choice;
- быть визуально равноправным остальному сайту.

### `/cart`

Роль:

- полная проверка заказа;
- calm premium review screen.

### `/checkout`

Роль:

- front-end-only финальный handoff route;
- без реального backend submit, но с ощущением завершенного commerce flow.

### `/track/[token]`

Роль:

- post-order continuity route;
- низший приоритет по сравнению с homepage/menu/product/delivery/cart/checkout.

Допустимый подход в этой фазе:

- mock/local tracking state;
- без реального provider sync.

## Приоритет реализации

### P0

- `/`
- `/menu`
- `/product/[productId]`

### P1

- `/delivery/address`
- `/delivery/result`
- `/pickup/points`

### P2

- `/cart`
- `/checkout`

### P3

- `/track/[token]`

## Что исключить из публичной цели

Не считать частью основной задачи:

- `/demo`
- `/investor-demo`
- `/investor-demo/vision`
- `/ops/*`
- `/courier/*`
- `/api/*`

## Навигационная логика сайта

Верхний публичный контур должен крутиться вокруг:

- бренд / homepage;
- каталог;
- доставка;
- самовывоз;
- заказ.

Важно:

- не навешивать в публичную навигацию demo/investor/admin смысл;
- не тащить в публичный UX ops-лексикон.
