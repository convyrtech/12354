# Tranche A3 Prompt

```text
Работай только по `docs/current/codex-site-build-pack/*`.

Текущий tranche: `A3 delivery + map presentation`.

Переходи к нему только если homepage, menu и product уже собраны в один сильный публичный язык.

Цель:
- превратить `/delivery/address` и `/delivery/result` в premium service UX;
- сохранить карту;
- не трогать backend integrations;
- усилить именно presentation layer и route experience.

Строго не делать:
- не подключать Yandex API
- не строить новый geo backend
- не чинить `src/server/*`, если это не blocker для рендера
- не превращать работу в routing-platform task

Основные файлы:
- `src/app/delivery/address/page.tsx`
- `src/app/delivery/result/page.tsx`
- `src/components/pages/delivery-address-page.tsx`
- `src/components/pages/delivery-result-page.tsx`
- `src/components/maps/delivery-maplibre-canvas.tsx`
- `src/app/globals.css`

Разрешено читать как truth:
- `src/lib/fixtures.ts`
- `src/lib/delivery-policy.ts`
- `src/lib/timing-policy.ts`
- `public/map-styles/raki-investor-dark.json`

Что нужно получить:
- address-first flow ощущается дорогим сервисом;
- карта выглядит curated и premium;
- contour, point, zone, ETA и service truth читаются красиво;
- route не похож на dispatch/admin UI;
- pickup fallback остается честным.

Что нельзя допустить:
- backend rabbit hole;
- дешевые map overlays;
- пустые техничные панели;
- визуальный язык, отличный от homepage/menu/product.

В конце tranche:
1. `npm run build`
2. проверь `/delivery/address` и `/delivery/result`
3. перечисли:
   - что изменил
   - какие файлы были основными
   - какой минимум остался до truly premium map route
```
