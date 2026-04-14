# Tranche A4 Prompt

```text
Работай только по `docs/current/codex-site-build-pack/*`.

Текущий tranche: `A4 cart + checkout + pickup`.

Переходи к нему только если уже сильны:
- `/`
- `/menu`
- `/product/[productId]`
- `/delivery/address`
- `/delivery/result`

Если времени мало, делай этот tranche минимально, но чисто.

Цель:
- довести `/cart`, `/checkout`, `/pickup/points` до цельного публичного уровня;
- не уходить в сложную бизнес-логику;
- сохранить premium tone даже в utilitarian routes.

Основные файлы:
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/pickup/points/page.tsx`
- `src/components/pages/cart-page.tsx`
- `src/components/pages/checkout-page.tsx`
- `src/components/pages/pickup-points-page.tsx`
- `src/components/navigation.tsx`
- `src/components/cart-pill.tsx`
- `src/app/globals.css`

Что нужно получить:
- `/cart` как calm premium review;
- `/checkout` как собранный front-end-only submit route;
- `/pickup/points` как полноценный route, а не забытый fallback;
- цельный стиль с остальным сайтом.

Что не нужно делать:
- backend submit architecture
- реальный tracking/provider sync
- усложнение формы ради “полноты”
- новые фичи, если они не дают явного визуального или UX результата

Stop-loss внутри tranche:
- если не успеваешь, упрощай behavior, но доводи визуальную иерархию;
- не жертвуй quality ради лишней логики.

В конце tranche:
1. `npm run build`
2. проверь `/cart`, `/checkout`, `/pickup/points`
3. перечисли:
   - что изменил
   - что упростил сознательно
   - что осталось на потом
```
