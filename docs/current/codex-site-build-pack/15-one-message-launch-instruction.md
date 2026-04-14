# One Message Launch Instruction

```text
Работай в репозитории проекта и начинай только с чистого пакета `docs/current/codex-site-build-pack/`.

Главный файл: `docs/current/codex-site-build-pack/00-codex-operating-contract.md`

Сначала:
1. прочитай `00-codex-operating-contract.md`
2. прочитай `10-preflight-checklist.md`
3. сделай preflight полностью
4. если есть blocker, коротко сообщи его и сначала устрани blocker

После успешного preflight:
1. прочитай `09-night-ops-playbook.md`
2. начни с tranche `A1` из `11-tranche-a1-homepage.md`
3. не читай и не используй как рабочую рамку:
   - `demo`
   - `investor-demo`
   - `ops`
   - `courier`
   - `source/`
   - `src/server/*` как primary target
4. не уходи в backend integrations
5. не придумывай новые факты о бренде

После завершения каждого tranche:
- запусти `npm run build`
- визуально проверь затронутые маршруты
- кратко перечисли:
  - что изменил
  - какие файлы были ключевыми
  - что осталось слабым

Порядок tranche-ов:
1. `11-tranche-a1-homepage.md`
2. `12-tranche-a2-menu-product.md`
3. `13-tranche-a3-delivery-map.md`
4. `14-tranche-a4-cart-checkout-pickup.md`

Stop-loss rules обязательны:
- если homepage не стала сильной после A1, не переходи дальше
- если menu/product слабые после A2, не лезь в checkout
- если карта начинает тянуть в backend, режь интеграционную часть и усиливай только front-end presentation

Цель: к утру получить сильный public-facing premium site tranche, а не незавершенный “почти большой проект”.
```
