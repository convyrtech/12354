# Tranche A2 Prompt

```text
Работай только по `docs/current/codex-site-build-pack/*`.

Текущий tranche: `A2 menu + product`.

Переходи к нему только если homepage уже выглядит как сильный flagship route.

Цель:
- сделать `/menu` premium browsing surface;
- сделать `/product/[productId]` дорогой product page;
- убрать app/admin feeling из commerce routes;
- продолжить visual language homepage в каталог и товар.

Не трогай:
- backend
- `src/server/*`
- `src/app/api/*`
- delivery/backend logic, кроме минимальной visual consistency
- `demo`, `investor-demo`, `ops`, `courier`

Основные файлы:
- `src/app/menu/page.tsx`
- `src/app/product/[productId]/page.tsx`
- `src/components/pages/menu-page.tsx`
- `src/components/pages/product-page.tsx`
- `src/components/cart-pill.tsx`
- `src/components/navigation.tsx`
- `src/app/globals.css`

Разрешено при необходимости:
- `src/lib/fixtures.ts`
- `src/lib/homepage-data.ts`

Что нужно получить:
- `/menu` как editorial commerce, а не grid-приложение;
- key product groups читаются сразу;
- category browsing выглядит premium;
- product page строится вокруг желания, изображения и статуса продукта;
- size / recipe / weight / sauces остаются точными, но не превращают экран в отчет.

Что нельзя допустить:
- generic ecommerce card layouts;
- слишком много chips;
- configurator report feeling;
- потеря brand tone;
- визуальный разрыв с homepage.

В конце tranche:
1. `npm run build`
2. проверь `/menu` и один сильный продукт, минимум `item_crayfish_boiled`
3. перечисли:
   - что изменил
   - какие файлы ключевые
   - что еще мешает menu/product быть truly premium
```
