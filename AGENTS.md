# The Raki Agent Guide

This repository uses Codex as an execution agent, not as a brainstorming machine.

Use this file as the durable operating contract for all Codex work in this repo.

## Working mode

Treat Codex like a configured teammate:

- start from a clear task
- stay inside the requested tranche
- make real changes
- verify them
- report briefly

Do not turn simple instructions into long audits, theory dumps, or repo-wide exploration.

## Prompt contract

The best task prompt for Codex in this repo has 4 parts:

1. Goal
2. Context
3. Constraints
4. Done when

If the operator prompt is fuzzy, first tighten scope. Do not start a giant exploratory pass by default.

## Default workflow

For difficult tasks, plan first. Then execute one tranche only.

Mandatory loop:

1. Read only the minimal required context.
2. State the tranche, touched routes, and 3-5 moves max.
3. Implement.
4. Run verification.
5. Report briefly.
6. Stop unless explicitly asked to continue to the next tranche.

## Scope rules

Primary target:

- public-facing premium site for The Raki

Do not treat these as the main target:

- `src/app/demo/*`
- `src/app/investor-demo/*`
- `src/app/ops/*`
- `src/app/courier/*`
- `src/server/*`
- `src/app/api/*`
- backend integrations

If a task starts drifting into backend, infra, or platform architecture, cut that path and return to public presentation work.

## Source-of-truth docs

Read these before major public-site work:

- `docs/current/codex-site-build-pack/00-codex-operating-contract.md`
- `docs/current/codex-site-build-pack/01-master-brief.md`
- `docs/current/codex-site-build-pack/03-brand-and-content-truth.md`
- `docs/current/codex-site-build-pack/03b-contacts-and-footer-truth.md`
- `docs/current/codex-site-build-pack/04-catalog-and-commerce-truth.md`
- `docs/current/codex-site-build-pack/05-maps-and-service-ux.md`
- `docs/current/codex-site-build-pack/06-visual-direction-and-rules.md`
- `docs/current/codex-site-build-pack/09-night-ops-playbook.md`
- `docs/current/codex-site-build-pack/10-preflight-checklist.md`
- `docs/current/codex-site-build-pack/17-non-negotiables.md`
- `docs/current/codex-site-build-pack/18-success-criteria-by-route.md`

Do not widen context unless there is a real blocker.

## Tranche discipline

Ask for and execute one tranche at a time.

Default order:

1. `A1`: homepage + navigation + globals
2. `A2`: menu + product
3. `A3`: delivery + map presentation
4. `A4`: pickup + cart + checkout

Stop-loss:

- if homepage is still weak after `A1`, do not move on
- if menu/product are still weak after `A2`, do not move on
- if delivery/map starts pulling work into backend, cut behavior and improve presentation only

## Anti-rabbit-hole rules

Do not:

- read the whole repo unless asked
- audit unrelated routes
- defend the current design direction as canonical
- spend time choosing colors, fonts, or brand system unless explicitly asked
- produce multiple speculative redesign directions unless explicitly asked
- write long design essays
- solve "everything" in one pass

Important:

- current design, current color scheme, and current hero are not approved canon
- do not preserve them by default
- do not lock a new visual direction without explicit instruction

## What to optimize for right now

Optimize for workflow quality, not for endless ideation.

That means:

- short audit
- narrow tranche
- visible improvement
- build passes
- browser sanity check
- concise report

## Reporting format

Keep reports compact.

Before coding:

- tranche
- files likely to change
- 3-5 moves max

After coding:

- what changed
- what was verified
- residual risks

No long motivational filler.

## Verification

After each tranche:

- run `npm run build`
- visually check the touched public routes
- confirm mobile did not collapse

If verification fails, fix the issue before proposing the next tranche.

## Browsing and freshness

If the task depends on unstable or current information, verify it first using primary sources.

Use browsing only when needed:

- latest patterns
- current tooling behavior
- current product/docs behavior

Prefer official or primary sources over summaries.

## Definition of done

A tranche is done only if:

- the intended public route clearly improved
- the work stayed inside scope
- build still passes
- no major regression was left unmentioned

If the tranche is not strong enough, do not move to the next one.
