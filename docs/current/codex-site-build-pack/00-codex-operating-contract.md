# Codex Operating Contract

## Стартовая рамка

Ты делаешь `публичный премиальный сайт The Raki`.

Не делаешь:

- demo;
- investor pack;
- ops shell;
- courier tooling;
- backend integration pass.

Сайт должен быть:

- public-facing;
- multi-route;
- premium;
- brand-first;
- с картами;
- без YUMA / iiko integration в этой фазе.

## Читать только это

Перед стартом используй только:

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

Не расширяй контекст без необходимости.

## Что нельзя читать как рабочую рамку

- `source/`
- `src/app/demo/*`
- `src/app/investor-demo/*`
- `src/app/ops/*`
- `src/app/courier/*`
- `src/server/*` как primary target
- `research/*`
- dated docs outside the clean pack, если они не нужны для конкретного blocker-а

## Обязательный порядок работы

1. Сначала `preflight`.
2. Потом коротко сформулируй:
   - `3-5` design moves
   - текущий tranche
   - какие файлы трогаешь
3. Затем сразу делай реальные изменения.
4. После tranche:
   - `npm run build`
   - визуальная проверка затронутых маршрутов
   - короткий residual risk list
5. Только потом переходи дальше.

## Приоритет результата

Сначала улучшай то, что сильнее всего влияет на ощущение сайта:

1. homepage
2. navigation / shell / globals
3. menu
4. product
5. delivery + map presentation
6. pickup
7. cart / checkout
8. tracking

## Decision rules

### Если выбор между backend и визуальным результатом

Выбирай визуальный результат.

### Если выбор между новой логикой и сильным presentation layer

Выбирай presentation layer, если текущая логика уже достаточна для public-facing routes.

### Если выбор между количеством экранов и качеством ключевых маршрутов

Выбирай качество ключевых маршрутов.

### Если выбор между “полным” сайтом и сильным tranche

Выбирай сильный tranche.

## Контентные правила

Не придумывай новые факты о бренде.

Используй только подтвержденное:

- `2017`
- Moscow / MO
- раковарня
- ассортиментное ядро меню: варёные / жарёные / живые раки
- креветки / краб / мидии / икра / подарки
- private-service tone
- контакты из `03b-contacts-and-footer-truth.md`

Для homepage это не означает структуру блоков по типам раков.
На `/` brand-first подача важнее category-first композиции.

Если есть конфликт в источниках:

- не выдумывай третье значение;
- сохрани текущее публичное значение;
- коротко отметь конфликт в итоге.

## Дизайн-правила

Нельзя:

- generic dark luxury;
- hero-only pass;
- marketplace grid feeling;
- admin/dashboard look;
- bland shadcn restyle;
- typography without authority;
- card soup;
- helper-copy вместо композиции.

Нужно:

- strong art direction;
- editorial commerce;
- appetite + exactness;
- premium marine noir;
- цельный язык на всех публичных маршрутах.

## Границы правок

Трогай в первую очередь:

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
- `src/components/navigation.tsx`
- `src/components/cart-pill.tsx`
- `src/components/maps/delivery-maplibre-canvas.tsx`
- `src/app/globals.css`

Не трогай без крайней необходимости:

- `src/server/*`
- `src/app/api/*`
- internal ops surfaces

## Definition of Done

Tranche считается готовым, если:

- визуально заметно поднял уровень сайта;
- не сломал build;
- не развалил brand tone;
- не утащил работу в backend rabbit hole;
- оставил короткий список оставшихся слабых мест.
