# The Raki

This repo is in an architecture-first stage.

- Core flows and domain structure matter more than the current homepage polish
- Current home/design/features are not final and are not sacred
- The latest user instruction beats old repo context

## Source Of Truth

Use only these as the default source of truth:

- current user instructions
- code in `src/`
- config in `config/`
- runtime/build config in `package.json`, `next.config.ts`, `.env.example`

Do not treat old mockups, generated markdown, preview HTML files, or stale design documents as authoritative unless the user explicitly points to them.

Do not create new docs, audits, plans, or design writeups unless the user asks for them.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind v4 in `src/app/globals.css`
- Framer Motion
- Lenis
- MapLibre

## Architecture Map

- `src/app/*`: routes and route handlers
- `src/components/pages/*`: route-level UI
- `src/components/sections/*`: homepage sections
- `src/lib/draft.ts`: order draft model
- `src/components/draft-provider.tsx`: persisted draft state
- `src/server/orders/*`: order and iiko logic
- `src/server/geo/*`: delivery and geo logic

## Working Mode

- Explore code first. Read the affected route plus related lib/server files before editing.
- Keep changes tight. No unrelated refactors.
- Do not create parallel implementations.
- Do not edit `.next`, `node_modules`, or secret `.env*` files.
- For public UI, avoid generic SaaS aesthetics, but do not overfit to the current unfinished homepage.
- Prefer installed skills when they clearly fit the task instead of improvising the whole workflow from scratch.
- For homepage, branding, animation, or visible public UI work, proactively use or at least suggest `/frontend-design` and finish with `/design-review`.
- After non-trivial code changes or refactors, proactively run `/simplify`.
- For bug hunts or "why is this broken?" tasks, proactively use `/investigate`.
- For explicit review requests or pre-merge checks, proactively use `/review`.
- For architecture, sequencing, or big-system tradeoffs, proactively use `/think-through:deep-thinking`.
- If the task benefits from several competing viewpoints, suggest `/agent-teams:team-review` or `/agent-teams:team-debug`.

## Verify

- `npm run dev`
- `npm run lint`
- `npm run build:clean`
- `npm run verify`

If Windows build artifacts go stale, use `npm run build:clean`.
