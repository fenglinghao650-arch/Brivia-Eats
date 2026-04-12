# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brivia Eats MVP is a bilingual (Chinese/English) diner-facing web app for browsing restaurant menus, building carts with dietary alerts, and showing orders to servers. Built with Next.js App Router.

## Commands

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run db:migrate       # Run migrations using DATABASE_URL env var
npm run db:migrate:local # Run migrations against local 'brivia_eats' database
```

No test runner is configured yet.

## Tech Stack

Next.js 16.1.2, React 19.2.3, TypeScript 5, Tailwind CSS 4, PostgreSQL (pg 8.18.0), ESLint 9

Path alias: `@/*` maps to `./*` (tsconfig)

## Architecture

### Route Structure (App Router)

| Route | Purpose |
|-------|---------|
| `/` | Home/demo entry point |
| `/r/[restaurantId]` | Restaurant landing page |
| `/m/[menuId]` | Menu with inline dish expand + add-to-cart |
| `/r/[restaurantId]/cart` | Shopping cart with dietary alerts |
| `/r/[restaurantId]/show` | Show-to-server view |

Portal (`/portal/*`) and admin (`/admin/*`) routes are planned but not yet implemented.

### Source Organization

- `src/domain/` — Core types and business logic
  - `types.ts` — All entity types: `Restaurant`, `Menu`, `Dish`, `DishIngredient`, `MediaItem`, `QRCode`, etc. Every text field has `_native` (Chinese) and `_en` (English) variants.
  - `cart.ts` — Dietary alert aggregation logic (allergens, ingredient attributes across cart items)
  - `validation/` — Input validators
- `src/db/` — PostgreSQL data access layer
  - `index.ts` — Connection pool (pg), query builders, transaction helpers
  - `types.ts` — Database row types (separate from domain types)
  - `services/publish.ts` — Publishing/snapshot workflow logic
- `src/lib/` — Shared utilities
  - `cart.ts` — Cart localStorage read/write (temporary until DB integration)
- `src/mock/` — Sample restaurant data (楼外楼) used by current demo UI

### Database — 4-Layer Design

| Layer | Purpose | Key Rule |
|-------|---------|----------|
| A: Working | Editable canonical entities (`restaurants`, `menus`, `dishes`, `dish_ingredients`, `media`, `qr_codes`, `change_logs`) | Internal only, never exposed to diners |
| B: Snapshots | Immutable published versions (`menu_snapshots`, `dish_snapshots`, `snapshot_media`, `published_menus`) | Public menus served ONLY from snapshots |
| C: Raw Intake | Original submissions (`raw_submissions`, `raw_submission_files`) | Chinese-only, preserved as-is |
| D: AI Queue | Async processing (`ai_jobs`, `ai_job_results`) | Drafts require human approval |

**Publishing workflow:** Validate all dishes have `status='published'` and `review_status='approved'` → create immutable `menu_snapshot` + `dish_snapshots` → update `published_menus.current_snapshot_id` pointer. Rollback = pointer switch (no data deletion).

**Migration file:** `db/migrations/001_initial_schema.sql`

### Bilingual Field Convention

All content fields use dual columns: `*_native` (Chinese, from restaurant intake) and `*_en` (English, added by Brivia team).

### 3-Layer Dish Naming

1. **Cultural anchor:** `dish_name_native` + `dish_name_romanized`
2. **Ordering clarity:** `dish_name_en` (concise English translation)
3. **Cultural story:** `cultural_name_en` + `tagline_en` (optional marketing layer)

### Current Implementation State

The diner-facing UI is fully implemented using mock data in localStorage. The following are NOT yet built:
- Database integration (working tables <-> API)
- API route handlers
- Authentication / portal UI
- Admin review dashboard
- Media upload infrastructure
- Payments / checkout
- AI draft generation workflows

## Engineering Rules

These come from the project spec (SPEC.md is authoritative):

- Do NOT add features outside the spec's scope (no payments, user accounts, reviews UI)
- Do NOT auto-publish AI-generated content — all safety-critical fields require human approval
- Never guess allergens or ingredients
- Every write operation must produce a `change_logs` entry
- Prefer deterministic pipelines over agents
- Favor clarity over abstraction — choose the simpler implementation when unsure
- Mobile-web-first design
- Enforce review gates on safety-critical field changes (allergens, dietary flags)

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/brivia_eats
```

Or individual variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_POOL_SIZE`

## Key Files

- `docs/Brivia_Eats_Naming_System.md` — 3-layer dish naming convention
- `db/README.md` — Database layer documentation
- `IMPLEMENTATION_NOTES.md` — What's built vs deferred
