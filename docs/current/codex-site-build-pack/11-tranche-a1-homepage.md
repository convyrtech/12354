# Tranche A1 Prompt

```text
Работай только по `docs/current/codex-site-build-pack/*`.

Текущий tranche: `A1 homepage + navigation + global visual language`.

Цель этого tranche:
- сделать `/` сильной flagship homepage;
- собрать цельный premium visual language;
- обновить navigation и public shell;
- заложить язык, который потом можно протащить в inner routes.

Не трогай:
- backend
- `src/server/*`
- `src/app/api/*`
- `src/app/demo/*`
- `src/app/investor-demo/*`
- `src/app/ops/*`
- `src/app/courier/*`
- `src/components/pages/*`, кроме случаев крайней необходимости для shell consistency

Работай в первую очередь в этих файлах:
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/components/navigation.tsx`
- `src/components/sections/hero.tsx`
- `src/components/sections/brand-proof.tsx`
- `src/components/sections/product-theatre.tsx`
- `src/components/sections/service-strip.tsx`
- `src/components/sections/menu-entry.tsx`
- `src/components/sections/extensions-section.tsx`
- `src/components/sections/footer.tsx`

Что нужно получить:
- homepage уровня flagship premium brand site;
- не generic luxury dark;
- не hero-only;
- сильный art direction по всей странице;
- сильная typographic hierarchy;
- сильная композиция ниже первого экрана;
- navigation, которая выглядит частью дорогого сайта, а не служебной полосой.

Что нельзя допустить:
- marketplace feel;
- giant category dump on homepage;
- homepage, собранную вокруг `варёные / жарёные / живые`;
- безопасные одинаковые карточки;
- слабый mobile rhythm;
- investor/demo/prototype wording.

В конце tranche:
1. запусти `npm run build`
2. проверь `/` визуально
3. перечисли:
   - что изменил
   - какие файлы были ключевыми
   - какие 3 слабых места еще остались на homepage
```
