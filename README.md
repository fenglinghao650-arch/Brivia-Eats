# Brivia Eats MVP

Bilingual (Chinese/English) diner-facing web app for curated city restaurant discovery, browsing restaurant menus, building carts with dietary alerts, and showing orders to servers. Built with Next.js App Router and PostgreSQL.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run db:migrate       # Run migrations against DATABASE_URL
npm run db:migrate:local # Run migrations against local 'brivia_eats' database
```

No test runner is configured yet.

## Tech stack

Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, PostgreSQL (pg).

## Routes

| Route | Purpose |
|-------|---------|
| `/` | City discovery home with map/list/saved views |
| `/portal` | Restaurant portal list |
| `/portal/[restaurantId]` | Restaurant/menu editing portal |
| `/r/[restaurantId]` | Restaurant landing |
| `/m/[menuId]` | Menu with inline dish expand + add-to-cart |
| `/r/[restaurantId]/cart` | Cart with dietary alerts |
| `/r/[restaurantId]/show` | Show-to-server view |

## Current state

Diner-facing discovery/menu UI, public restaurant/menu API routes, and a basic restaurant portal are implemented. Cart and saved restaurants are client-side `localStorage`. Auth, admin review workflows, QR short-code resolution, and full publish-gate enforcement still need production hardening.

## Environment

```
DATABASE_URL=postgresql://user:password@localhost:5432/brivia_eats
```

## Documentation

- [`PROJECT_SCOPE.md`](PROJECT_SCOPE.md) — full cross-repo scope: all three codebases, end-to-end data flow, what's built vs deferred
- [`CLAUDE.md`](CLAUDE.md) — architecture, source organization, engineering rules
- [`docs/Brivia_Eats_Naming_System.md`](docs/Brivia_Eats_Naming_System.md) — 3-layer dish naming convention
- [`docs/SPEC_v1_1_1_merged.md`](docs/SPEC_v1_1_1_merged.md) — product spec
