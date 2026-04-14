# Preflight Checklist

## Сделать до первого промпта

1. Убедиться, что активный контекст только из `codex-site-build-pack/`.
2. Не давать Codex читать:
   - `demo`
   - `investor-demo`
   - `ops`
   - `courier`
   - `source/`
3. Проверить текущую сборку:
   - `npm run build`
4. Быстро открыть и визуально проверить:
   - `/`
   - `/menu`
   - `/product/item_crayfish_boiled`
   - `/delivery/address`
   - `/delivery/result`
5. Проверить, что карта вообще рендерится.
6. Проверить, что логотип и брендовые изображения доступны.
7. Зафиксировать, что tonight goal:
   - premium public site
   - no YUMA / iiko
   - maps stay
   - homepage strongest, but site multi-route

## Если preflight падает

- сначала чинить blocker;
- не начинать redesign поверх неработающей базы.
