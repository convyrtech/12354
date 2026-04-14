# Codex Implementation Prompt

```text
Работай в репозитории `E:\rakidemo`.

Твоя задача: собрать сильный, современный, премиальный публичный сайт The Raki. Это должен быть не investor demo и не backend-интеграционный прототип, а полноценный public-facing site без реальных backend-подключений. Не подключай YUMA. Не подключай iiko. Карты и service UX должны остаться.

Перед началом прочитай только этот чистый пакет и считай `00-codex-operating-contract.md` главным operational document:
- `docs/current/codex-site-build-pack/00-codex-operating-contract.md`
- `docs/current/codex-site-build-pack/README.md`
- `docs/current/codex-site-build-pack/01-master-brief.md`
- `docs/current/codex-site-build-pack/02-routes-and-page-jobs.md`
- `docs/current/codex-site-build-pack/03-brand-and-content-truth.md`
- `docs/current/codex-site-build-pack/03b-contacts-and-footer-truth.md`
- `docs/current/codex-site-build-pack/04-catalog-and-commerce-truth.md`
- `docs/current/codex-site-build-pack/05-maps-and-service-ux.md`
- `docs/current/codex-site-build-pack/06-visual-direction-and-rules.md`
- `docs/current/codex-site-build-pack/07-implementation-boundaries.md`
- `docs/current/codex-site-build-pack/09-night-ops-playbook.md`
- `docs/current/codex-site-build-pack/10-preflight-checklist.md`

Игнорируй:
- `source/`
- `src/app/demo/*`
- `src/app/investor-demo/*`
- `src/app/ops/*`
- `src/app/courier/*`
- `src/server/*` как главную цель
- `.next`, `output`, `data/orders`, временные логи и прочий runtime-мусор

Что нужно получить:
- сильную flagship homepage
- полноценный визуально цельный публичный сайт
- premium menu browsing
- premium product pages
- красивый address-first delivery flow с картой
- pickup route
- cart / checkout без backend, но с ощущением настоящего commerce flow

Что нельзя сломать:
- публичные маршруты `/`, `/menu`, `/product/[productId]`, `/delivery/address`, `/delivery/result`, `/pickup/points`, `/cart`, `/checkout`, `/track/[token]`
- truth бренда: The Raki = раки + сильная кухня + private service tone
- ассортиментное ядро меню: варёные / жарёные / живые раки
- карты как часть service UX

Что нельзя делать:
- не делать generic dark luxury template
- не делать hero-only редизайн
- не превращать homepage в giant category dump
- не строить homepage как раскладку по `варёные / жарёные / живые`
- не делать marketplace/grid feel
- не делать admin/dashboard feel на внутренних маршрутах
- не тратить основную энергию на backend integrations
- не уводить работу в investor/demo framing

Визуальное направление:
- premium marine noir
- bold editorial commerce
- appetite + exactness
- спокойный, дорогой, авторский digital presence
- высокий уровень art direction

Техническая рамка:
- работай в активном `src/`
- используй текущий стек Next.js 15 / React 19 / Framer Motion / MapLibre
- допускаются mock/local state и fixture-driven flows
- можно глубоко переписывать публичные страницы и presentation layer

Порядок работы:
1. Сначала сделай preflight.
2. Потом прочитай пакет и коротко сформулируй 3-6 ключевых design moves.
3. Потом составь краткий план и укажи текущий tranche.
4. Затем сразу делай реальные изменения в коде.
5. Приоритет: `/`, `/menu`, `/product/[productId]`, `/delivery/address`, `/delivery/result`, затем `/cart`, `/checkout`, `/pickup/points`, `/track/[token]`.
6. Работай не косметикой, а production-grade tranche, который реально поднимает уровень сайта.

Проверка обязательна:
- запусти `npm run build`
- если можешь, визуально проверь ключевые публичные маршруты
- сам исправь найденные слабые места

В конце дай:
- что изменено
- ключевые design decisions
- какие файлы были основными
- какие конфликты источников или контентные ограничения ты сохранил сознательно
- что еще осталось добить до полного финала
- прошла ли сборка
```
