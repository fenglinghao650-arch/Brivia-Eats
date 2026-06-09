# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Cross-repo context:** See `PROJECT_SCOPE.md` in this repo for the full Brivia Eats platform — all three repos (Intake Agent, Menu Pipeline, MVP), the end-to-end data flow, data contracts, and what's built vs deferred.

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
| `/` | City discovery home with map/list/saved views |
| `/portal` | Restaurant portal list |
| `/portal/[restaurantId]` | Restaurant/menu editing portal |
| `/r/[restaurantId]` | Restaurant landing page |
| `/m/[menuId]` | Menu with inline dish expand + add-to-cart (English) |
| `/m/[menuId]/languages` | Full-page language picker (QR target for translated menus) |
| `/m/[menuId]/[lang]` | Menu in a translated locale (`ja` / `ko` / `es`) |
| `/r/[restaurantId]/cart` | Shopping cart with dietary alerts |
| `/r/[restaurantId]/show` | Show-to-server view |

Per-restaurant translations are stored once in `menu_translations` (generate via the portal "Update multi-lingual menus" button or `npx tsx scripts/translate-menu.ts`). Branded menu QR cards: `npx tsx scripts/generate-qr.ts`.

Admin (`/admin/*`) routes and portal authentication are planned but not yet implemented.

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

The diner-facing discovery/menu UI is implemented with a mix of published database content and local client state. Public restaurant/menu API routes and a basic restaurant portal are present. The following are NOT yet built or production-complete:
- QR short-code route resolution
- Authentication for portal/admin surfaces
- Admin review dashboard
- Complete media upload infrastructure beyond restaurant cover upload
- Full ChangeLog coverage for every portal mutation
- Full publish-gate enforcement for `ai_status`, review status, and safety-confidence state
- Payments / checkout
- AI draft generation workflows

## Engineering Rules

These come from the project spec (SPEC.md is authoritative):

- Do NOT add features outside the spec's scope (no payments, user accounts, reviews UI)
- City browsing and curated restaurant discovery are in scope when limited to active, published Brivia-enabled restaurants
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

## UI/UX Improvement Plan

Audited 2026-04-20. Phases below are ordered by priority.

### Phase 1 — Fix broken flows ✅ (done)
1. Remove login button — hidden until auth is built (was a dead tap target)
2. Remove Favorites tab + heart buttons — local state only, never persisted; shows broken placeholder view
3. Fix error states — restaurant/menu not-found pages now have back link + retry button
4. Clear Cart confirmation — confirm dialog before wiping all items

### Phase 2 — Brand identity (next)
5. Wire up Brivience brand tokens: cream `#fbf9f1`, charcoal `#1e1e1e`, gold `#d98f11` / `#fcc845`, border `#d9d9d9`
6. Replace fonts: Playfair Display + DM Sans (match Brivience website exactly)
7. Apply palette to all components — warm cream surfaces, charcoal text, gold CTAs
8. Fix logo lockup — consistent B + "rivia Eats" sizing and spacing on every page

### Phase 3 — Loading & feedback states
9. Skeleton loaders for restaurant list cards and menu sections
10. Image fallback — restaurant initial over brand-colored bg instead of gray void
11. Cart thumbnail fallback — same treatment
12. Active filter label — show "Category: [Name] ×" pill when filter is on

### Phase 4 — UX polish
13. Standardize allergen UI — single pattern (icon + badge) in both menu expansion and cart alerts
14. Menu dish name clamp — enforce `line-clamp-2` on clarity names so Add to Cart buttons align
15. Cart touch targets — quantity +/− buttons minimum 44×44px on mobile
16. Show to Server clarity — add instruction line at top explaining screen purpose
17. Currency — standardize to ¥ symbol everywhere

### Phase 5 — Accessibility baseline
18. `:focus-visible` on all interactive elements with gold outline
19. `aria-label` on all icon-only buttons (login, heart, close, nav)
20. Color contrast audit after palette change (WCAG AA for zinc-400/500 on new surfaces)
