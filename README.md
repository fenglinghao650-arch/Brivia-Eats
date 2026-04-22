# Brivia Eats MVP

Bilingual (Chinese/English) diner-facing web app for browsing restaurant menus, building carts with dietary alerts, and showing orders to servers. Built with Next.js App Router and PostgreSQL.

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
| `/` | Home / demo entry |
| `/r/[restaurantId]` | Restaurant landing |
| `/m/[menuId]` | Menu with inline dish expand + add-to-cart |
| `/r/[restaurantId]/cart` | Cart with dietary alerts |
| `/r/[restaurantId]/show` | Show-to-server view |

## Current state

Diner-facing UI is implemented with mock data in localStorage. API routes, auth, admin tooling, and review workflows are not yet built.

## Environment

```
DATABASE_URL=postgresql://user:password@localhost:5432/brivia_eats
```

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — architecture, source organization, engineering rules
- [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md) — what's built vs deferred
- [`db/README.md`](db/README.md) — 4-layer database design and publish workflow
- [`docs/SPEC_v1_1_1_merged.md`](docs/SPEC_v1_1_1_merged.md) — authoritative product spec
- [`docs/Brivia_Eats_Naming_System.md`](docs/Brivia_Eats_Naming_System.md) — 3-layer dish naming convention
