# TODOS

## Menu (Phase 2 redesign follow-ups)

### Replace placeholder imagery with real food photography

**What:** Commission food photography for the 10 sections on `/menu` — live/boiled/fried crayfish, раковые шейки, mussels, vongole, king crab, Magadan shrimp varieties, red/black caviar, desserts, drinks, gift sets — and swap `src/lib/category-images.ts` keys one-by-one without component rerender.

**Why:** Placeholders will read as amateur next to the editorial cream layout, breaking trust at investor demo. The plan's "Сохраняем category-images.ts" decision is a temporary bridge; shipping without a real photo shoot leaves the page 70% of its intended visual quality.

**Context:** Style brief — cream backdrop (not dark), natural light, food served on real serving ware the restaurant uses, no styled prop garnishes, no over-saturated top-down "Instagram food" shots. Target aspect ratios: 4:3 for editorial leads (Раки, Крaб), 1:1 for compact cards (мидии/креветки), 4:5 for luxury asymmetric (Крaб). Must include: shot of crab's broken claw structure, live crawfish in water, mussels with bread. Component-level change is trivial — imageKey → new URL in fixtures. All UI hooks exist.

**Effort:** L (photographer engagement + shoot day + retouching)
**Priority:** P2
**Depends on:** Menu Phase 2 ships; client provides brief and budget for shoot

### Redesign /product/[id] to match cream editorial vocabulary

**What:** Rewrite `src/components/pages/product-page.tsx` to share the /menu visual language — Cormorant italic hero headline, metadata strip under title, recipe chips, photo 4:5, cream surface. Keep existing draft-building and cart logic intact.

**Why:** Post-Phase-2 `/menu` is cream editorial, but clicks through to the product page drop the user into the old dark catalog page. Visual whiplash breaks the narrative arc and reads as "unfinished product" to an investor. Conversion funnel cost: user who lands on product page from /menu likely bounces back.

**Context:** Reuse components from `src/components/menu/cards/` (specifically `recipe-chips.tsx`, `size-row.tsx` for variable-priced items, metadata strip pattern). Keep `getProductCommercialTruth`, `getMenuItem`, bundled/upsell data wiring unchanged. Product page retains modal-less full-page layout — it's the deep-dive view, distinct from /menu's snapshot grid. Mobile layout mirrors /menu's stacked card pattern.

**Effort:** M (1-2 days human / 1 hour CC)
**Priority:** P1
**Depends on:** Menu Phase 2 ships (source of shared components)

### Rebuild /cart with bundledAccessories / upsellAccessories UI

**What:** Redesign `src/components/pages/cart-page.tsx` to (1) render the cream editorial vocabulary, (2) display bundled accessories (перчатки к ракам, гренка к мидиям) as sub-items under their parent line with "включено" marker, (3) surface AI-waiter upsells (доп-гренка 100 ₽, ножницы 300 ₽, sauces 100 ₽) in a dedicated section driven by `upsellAccessories` + waiter recommendations.

**Why:** Menu Phase 2 ships bundledAccessories and upsellAccessories data in fixtures — the draft already carries them, but `/cart` doesn't consume either. Without this PR bundled accessories are invisible to the user, and the upsell revenue loop never closes. "Включено перчатки" is also a trust signal that the kitchen thought of the meal as a whole — shipping without it undersells the brand's core promise.

**Context:** The Phase 2 plan puts bundled accessories as *derived* entries (via `computeBundledSubItems` in `src/lib/menu/bundled-accessories.ts`) that `getDraftCartView()` returns alongside `lineItems`. They never mutate `draft.lineItems` — cleaner model, no rescale-on-qty-change bugs. This /cart rebuild is the UI consumer that reads `cartView.bundledSubItems` per parent line and renders them as "включено" sub-items. Stop-list routing (per-kitchen resolver for cart items) is a separate concern — tackled in a later PR. Keep existing line-item schema; bundled rendering is a visual grouping, not a data model change.

**Effort:** M-L (2-3 days human / 2-3 hours CC)
**Priority:** P1
**Depends on:** Menu Phase 2 ships (bundled data derived in view); /product/[id] redesign (shares visual tokens)

### Rate-limit /api/waiter/respond (post-Phase-5)

**What:** Add a sliding-window rate limiter on the Next.js App Router API route `src/app/api/waiter/respond/route.ts` — 20 req/min per IP (matching openrouter free tier), backoff on exceeded with polite mock fallback.

**Why:** Openrouter free tier hard limits at 20 req/min / 200 req/day. Without limiter the first bot/crawler/synthetic test wave exhausts the global quota and blocks all users for a day. Additionally, per-IP limiting prevents a single abuser from degrading the experience for legitimate users.

**Context:** Phase 5 of the menu plan ships the route handler behind `OPENROUTER_API_KEY` env. Rate limiter can be either: (a) in-memory sliding window (cheap, resets on cold start — acceptable since we're on Fluid Compute with shared instances), or (b) Vercel KV-backed (persistent, costs pennies, true global limit). Implementation: wrap the handler with a rate-limit middleware that on exceeded returns a WaiterResponse with mock reply + suggested chips (silent degradation). Never 429 the client — that breaks the fallback contract.

**Effort:** S (1 day human / 30 min CC)
**Priority:** P2 (required before public traffic, not required for investor demo)
**Depends on:** Phase 5 of menu plan (openrouter wiring) ships

### Migrate /menu to Server Components + client islands

**What:** Convert static-fixture-driven sections (мидии, вонголе, икра, десерты, напитки, подарки) from Client Components to Server Components. Keep Client Components for interactive islands only: waiter block, raki section (tabs + recipe chips), triptych (hover), CartPill, CitySwitcher.

**Why:** Current `/menu` plan renders fully client-side — all 50-80 cards + 10 sections hydrate on load. LCP target < 2.5s and CLS < 0.1 are met but could improve 0.5-1s with SSR + partial hydration. Bundle JS drops ~30%.

**Context:** Blockers: `draft-provider`, `city-context`, `useFakeAuth`, `useSectionProgress` are all client-only (context / localStorage / DOM). Any component consuming them must be client. Static sections (no draft interaction at component level, just `add-to-cart` link that dispatches to draft via CartPill) CAN be server. The add-to-cart button inside a server section becomes a tiny client island. Requires splitting files: `mussels-section.server.tsx` + `mussels-section-card.client.tsx` etc. Non-trivial migration, ~1 day effort.

**Effort:** M (2 days human / 3 hours CC)
**Priority:** P3 (optimization, not blocker)
**Depends on:** Menu Phase 2 ships; stable LCP baseline measured post-ship

### Stop-list resolver Layer 2 — per-address kitchen routing in /cart

**What:** Implement `resolveKitchen(cart, address)` in `src/lib/cities/resolve-kitchen.ts` — given a user address and cart line items, determines which kitchen in the current city can fulfill the order, and flags any items that are stop-listed on that specific kitchen. Renders per-item badges in /cart.

**Why:** Menu Phase 2 implements Layer 1 (city-level aggregate stop-list): if ANY kitchen in the city has the item, it's shown available on /menu. But the actual kitchen fulfilling the order depends on delivery address. A Moscow user might land on a kitchen that has the каменный краб на стопе, while elsewhere in the same city it's available. Today this silently fails at checkout with iiko rejection.

**Context:** Phase 2 plan explicitly scopes Layer 2 OUT, leaves a data-level stub `resolveKitchen` with TODO. Real routing depends on: (a) delivery address lat/lng, (b) each kitchen's delivery zone polygon, (c) kitchen-specific stop-list from iiko. Today (a) exists, (b) is `sp_lesnoy_dispatch_01` zone only, (c) is `servicePointAvailability` in fixtures. Implementation: address → kitchenId resolver (start from existing delivery-policy.ts), then stop-list check per resolved kitchen, then per-item badge in /cart with option to "заменить на аналог". Affects /cart visual significantly.

**Effort:** M (2-3 days human / 2 hours CC)
**Priority:** P2 (silent iiko failures happen today; should fix before scaling traffic)
**Depends on:** /cart rebuild ships (UI consumer); multiple active kitchens per city (today only Moscow-Lesnoy is active — stub until second active kitchen exists)

## Design System

### Author DESIGN.md via /design-consultation

**What:** Run `/design-consultation` to produce `DESIGN.md` — the canonical document naming the typography scale, spacing rhythm, motion vocabulary, color tokens, CTA hierarchy, accessibility bar, and responsive breakpoints of the site.

**Why:** No DESIGN.md exists today. Every design review (`/plan-design-review`, `/design-review`, `/design-review-lite`) has to reconstruct the site's design system from code conventions. This wastes time on each review and lets drift accumulate silently between sections. With a DESIGN.md, future reviews calibrate against a stated system; onboarding and cross-section coherence become enforceable.

**Context:** The site has an implicit system — Fraunces via `--font-poster`, teal/cream/dark-teal palette via `--accent` / `--bg-cream` / `--bg-dark`, a cinematic 3D motion vocabulary (cream-pause flip / coverflow / parallax / z-depth recede), 3px focus-ring offset convention, a `.cta--primary` / `.cta--secondary` / `.cta--editorial` modifier family, and homepage section rhythm dark→cream→dark→cream→cream. All of this lives only in code. `/design-consultation` walks the consultant and the codebase together to write it up.

**Effort:** M
**Priority:** P2
**Depends on:** None
