# Night Ops Playbook

## Цель ночи

К утру должен быть готов `показываемый public-facing site tranche`, а не “почти готовый большой проект”.

## Утренний deliverable

### Обязательный A-scope

- `/`
- `/menu`
- `/product/[productId]`
- `/delivery/address`
- `/delivery/result`

### Условный B-scope

- `/pickup/points`
- `/cart`
- `/checkout`

### Заморожено до отдельного решения

- `/track/[token]`
- `demo`
- `investor-demo`
- `ops`
- `courier`
- backend integrations

## Порядок ночи

1. `preflight`
2. `A1 homepage + navigation + globals`
3. `A2 menu + product`
4. `A3 delivery + map presentation`
5. `A4 cart + checkout + pickup`, только если A-scope уже сильный
6. `mobile fixes`
7. `final build + screenshot pass`

## Stop-loss rules

- Если homepage не стала сильной к концу `A1`, не переходить дальше.
- Если `/menu` и `/product/[productId]` слабые к концу `A2`, не лезть в checkout.
- Если карта начинает тянуть в backend, резать интеграционную часть и усиливать только front-end presentation.
- Если время заканчивается, жертвовать:
  - `/track/[token]`
  - сложным checkout behavior
  - второстепенной анимацией
  - нефундаментальными polish-задачами

## После каждого tranche

- `npm run build`
- короткий визуальный проход по затронутым маршрутам
- `git diff --stat`
- следующий tranche только после проверки

## Главное правило

Не просить Codex “доделать все”. Просить только следующий tranche.
