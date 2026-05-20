# Brivia Eats — Full Project Scope

> **Working document.** Update this when the architecture, pipeline stages, or build state changes. This is the authoritative cross-repo reference for all three Brivia Eats codebases.

---

## What Brivia Eats Is

A bilingual (Chinese/English) culinary platform that helps foreign visitors to China browse restaurants, read menus they can actually understand, and order with confidence — without needing a translator or a local friend. The core value is **ordering confidence**: every dish has a clear English name, a cultural story, allergen information, and a "show to server" view.

The platform is built and operated by **Brivience** and targets Brivia-curated restaurants in Chinese cities.

---

## The Three Repos

| Repo | Language | Role in pipeline |
|---|---|---|
| `Brivia eats restaurant intake agent/` | Python / FastAPI | Stage 1 — converts raw menu photos/PDFs to structured Chinese data |
| `brivia eats menu pipeline/` | Python / CLI | Stage 2 — translates confirmed Chinese data to English, writes draft DB rows |
| `Brivia Eats MVP/` | Next.js / TypeScript | Stage 3 + consumer — portal for review/publish; diner-facing web app |

---

## End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  STAGE 1 — Intake Agent (FastAPI)                       │
│                                                         │
│  Restaurant submits menu photos / PDFs via API          │
│       ↓                                                 │
│  Stage 1: OCR    — gpt-4o vision → raw text blocks      │
│  Stage 2: Reason — OpenAI Structured Outputs → JSON     │
│  Stage 2.5: Validate — auto-fix allergens, strip marks  │
│  Stage 3: Map    — deterministic → Jinshuju payload     │
│  Stage 4: Submit — POST to Jinshuju confirmation form   │
└─────────────────────────┬───────────────────────────────┘
                          │  Jinshuju form entry (Chinese-only)
                          ▼
          ┌───────────────────────────────┐
          │  Restaurant reviews & confirms│
          │  the pre-filled Jinshuju form │
          └───────────────┬───────────────┘
                          │  confirmed entry (Chinese)
                          ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 2 — Menu Pipeline (Python CLI)                   │
│                                                         │
│  Stage 1: Read    — fetch confirmed Jinshuju entries    │
│  Stage 2: Parse   — form fields → typed ParsedEntry     │
│  Stage 3: Translate — gpt-4o → English fields           │
│  Stage 4: Write   — insert draft rows into MVP DB       │
└─────────────────────────┬───────────────────────────────┘
                          │  draft rows in PostgreSQL
                          ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 3 — MVP Portal (Next.js)                         │
│                                                         │
│  Brivia team reviews draft dishes in the portal         │
│  Edits English names, allergens, adds cover photo       │
│  Assigns city + category, enriches with AMap data       │
│  Publishes → immutable snapshot (visible to diners)     │
└─────────────────────────┬───────────────────────────────┘
                          │  published snapshot
                          ▼
             Diner-facing web app (Next.js)
             Map → Restaurant → Menu → Cart → Show to Server
```

**Shared infrastructure:**
- **Jinshuju** — Chinese form platform used as the intake confirmation step. Form token: `p1RGvP` (confirmation form), `JINSHUJU_INTAKE_FORM_TOKEN` (intake form).
- **PostgreSQL** (`brivia_eats` database) — shared between the Menu Pipeline (writes) and the MVP (reads + portal writes).
- **Supabase Storage** — cover photo uploads from the MVP portal.
- **AMap API** — geocoding, POI search, restaurant enrichment in the MVP.
- **OpenAI** — used by both the Intake Agent (OCR + reasoning) and the Menu Pipeline (translation).

---

## Repo 1: Restaurant Intake Agent

**Path:** `Brivia eats restaurant intake agent/`
**Language:** Python 3.11, FastAPI 0.115+, OpenAI SDK, httpx, pdf2image, Pydantic 2
**Server:** `uvicorn src.app.main:app --reload --port 8000`

### What it does
Takes menu images or PDFs from a restaurant, runs a 5-stage AI pipeline to extract structured Chinese menu data, and submits a pre-filled confirmation form to Jinshuju. The restaurant then reviews and confirms the form. No English translation happens here.

### 5-Stage Pipeline (`src/app/services/pipeline.py`)

| Stage | File | What happens |
|---|---|---|
| 1 — OCR | `ocr.py` | gpt-4o vision (or DeepSeek) → raw text blocks per image/page. High-detail mode, temp=0, 180s timeout, 3 retries. PDFs → images at 150 DPI. Pages run concurrently. |
| 2 — Reasoning | `reasoning.py` | OpenAI Responses API with `AgentOutput` as Pydantic `response_format` → schema-validated JSON. Schema in `schemas/agent_output_schema.json`. |
| 2.5 — Validation | `validator.py` | Auto-fixes in-place: strips "(推测)" markers, keyword-scans for allergens (e.g. "花生" → peanut), auto-adds `contains` flags from drink category. Warns on low confidence (<0.4). |
| 3 — Mapping | `mapper.py` | Pure Python, fully deterministic. Maps internal enums → Jinshuju form field codes from `mappings/jinshuju_codes.v1.json`. Parses Chinese addresses into province/city/district/street. No LLM calls. |
| 4 — Submission | `jinshuju.py` | HTTP Basic Auth POST to Jinshuju API v1. Creates a pre-filled confirmation form entry. 60s timeout. |

**Key rule:** No LLM calls after Stage 2. The mapper is pure Python and fully testable.

### API Endpoints (`src/app/main.py`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/intake` | Full pipeline, no Jinshuju submission |
| POST | `/api/v1/intake/submit` | Full pipeline + Jinshuju submission |
| POST | `/api/v1/intake/agent-output-only` | OCR + Reasoning + Validation only |
| POST | `/api/v1/jinshuju/submit-payload` | Retry/resubmit a pre-built payload |
| GET | `/api/v1/jinshuju/test` | Test Jinshuju connectivity |
| GET | `/api/v1/jinshuju/intake-entries` | List form submissions (paginated) |

All intake endpoints accept multipart: `restaurant_info` (JSON string) + `menu_files` (images or PDFs).

### Output Schema: `AgentOutput`

Schema version: `brivia.eats.intake.agent_output.v1`

- `restaurant` — name, address, contact (passed through from input; source=`intake_form_transfer`)
- `menu.dishes[]` — `DishItem`: category, native name, ingredients, cooking method, spice level, allergens, ingredient attributes, confidence scores, evidence strings
- `menu.drinks[]` — `DrinkItem`: same structure plus `contains` (alcohol/caffeine)
- `extraction_meta` — asset list, timestamp, `agent_mode="aggressive_draft"`, warnings

**Enums:**
- Dish categories: `cold | hot | staple | dessert | soup | other`
- Drink categories: `tea | coffee | fruit_tea | milk_tea | alcoholic | non_alcoholic | other`
- Spice: `none | mild | medium | hot`
- Allergens: `alcohol | gluten_wheat | soy | peanut | tree_nuts | dairy | egg | fish | shellfish | sesame`
- Ingredient attributes: `pork | beef | lamb | poultry | fish | shellfish`
- Drink contains: `alcohol | caffeine`

### Environment Variables

```
OCR_PROVIDER=openai              # "openai" or "deepseek"
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
DEEPSEEK_API_KEY=                # only needed if OCR_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
JINSHUJU_API_KEY=
JINSHUJU_API_SECRET=
JINSHUJU_CONFIRMATION_FORM_TOKEN=p1RGvP
JINSHUJU_INTAKE_FORM_TOKEN=
JINSHUJU_BASE_URL=https://jinshuju.net/api/v1
```

### Key Files
- `src/app/services/pipeline.py` — orchestration
- `schemas/agent_output_schema.json` — authoritative output schema for OpenAI
- `mappings/jinshuju_codes.v1.json` — enum → Jinshuju code lookup tables
- `docs/mapper_rules.md` — mapper specification (note: other docs under `docs/` are outdated; trust the code)

### Current State
Fully operational. Tested with real restaurant menu images. Outputs confirmed Jinshuju form entries that the Menu Pipeline reads.

---

## Repo 2: Menu Pipeline

**Path:** `brivia eats menu pipeline/`
**Language:** Python 3.9+, OpenAI SDK, psycopg2, pydantic 2, requests
**Run:** CLI scripts, no server

### What it does
Bridges the Intake Agent and the MVP. Reads confirmed Jinshuju entries (Chinese-only), translates them to English via OpenAI Structured Outputs, and writes draft rows into the MVP PostgreSQL working tables. All dishes are written as `status=draft` — human review is required before any of it goes live.

### 4-Stage Pipeline

| Stage | File | What happens |
|---|---|---|
| 1 — Read | `src/jinshuju/reader.py` | Fetch confirmed entries from the Jinshuju confirmation form via API |
| 2 — Parse | `src/jinshuju/parser.py` | Normalize Chinese form fields → typed `ParsedEntry` (restaurant + dishes + drinks) |
| 3 — Translate | `src/pipeline/translate.py` | gpt-4o via Structured Outputs → English fields for restaurant + all dishes (batched 8 dishes/call) |
| 4 — Write | `src/pipeline/write_to_db.py` | Insert draft rows into MVP working tables; idempotent via `raw_submissions` |

### Translation (Stage 3) — What Gets Generated

**Per dish:** `romanized_name` (spaced pinyin), `clarity_name_en` (concise description with sensory/contextual detail), `one_line_story_en` (one cultural/sensory sentence), `cooking_methods_en` (technique list). Restaurant context is passed in to enable culturally grounded stories.

**Per restaurant:** `name_en` (romanized pinyin), `about_short_en` (2–3 sentence English summary), `cuisine_tags` (1–3 specific tags), `address_en` (English address).

### Database Writes (Stage 4)

Writes to MVP Layer A (working tables) only:

| Table | What's written |
|---|---|
| `restaurants` | One row per import (updated on re-import of same serial) |
| `menus` | One row per restaurant |
| `dishes` | One row per dish — `status=draft`, `review_status=draft`, `ai_status=drafted` |
| `raw_submissions` | Layer C archive: original Jinshuju payload, `source=jinshuju`, `external_id=serial_number` |
| `change_logs` | Audit entry for every import run |

**Idempotency:** Re-importing the same serial is a no-op. Checked via `raw_submissions` before writing.

**Safety:** If the LLM returns fewer dishes than sent, `translate_dishes` raises `ValueError` rather than writing partial results.

### Data Models

- `src/models/parsed.py` — `ParsedEntry`, `ParsedRestaurant`, `ParsedDish`, `ParsedDrink`, `ParsedAddressParts`. All text still in Chinese.
- `src/models/translated.py` — `TranslatedRestaurant`, `TranslatedDish`. Both `_zh` source and `_en` translated fields, ready for DB write.

### CLI Commands

```bash
python -m src.pipeline.run_import                   # Import all new confirmed entries
python -m src.pipeline.run_import --serial 14       # Import one specific entry by serial
python -m src.pipeline.run_import --dry-run         # Parse + translate, do NOT write DB
python -m src.pipeline.run_import --list            # List all confirmed entries

python -m src.pipeline.approve_and_publish --list                          # List restaurants + approval state
python -m src.pipeline.approve_and_publish --restaurant-id <uuid>          # Approve all drafts + create snapshot
```

### Environment Variables

```
OPENAI_API_KEY=
JINSHUJU_API_KEY=
JINSHUJU_API_SECRET=
JINSHUJU_CONFIRMATION_FORM_TOKEN=p1RGvP
JINSHUJU_BASE_URL=https://jinshuju.net/api/v1
DATABASE_URL=postgresql://user:password@localhost:5432/brivia_eats
```

### Engineering Rules (enforced)
- No AI after Stage 3 — write path is pure Python
- Draft-by-default — every dish requires human review before publish
- Idempotency is mandatory — re-runs must not duplicate data
- Never drop data silently — LLM partial responses raise, not write
- Chinese fields are preserved alongside English translations

### Current State
Fully operational. Has been used to import real restaurant data. `approve_and_publish.py` is a dev CLI tool — the MVP portal is the intended production UI for the approval step.

---

## Repo 3: Brivia Eats MVP

**Path:** `Brivia Eats MVP/`
**Language:** Next.js 16.1.2, React 19, TypeScript 5, Tailwind CSS 4, PostgreSQL (`pg`)
**Server:** `npm run dev` → `localhost:3000`

### What it does
Two things in one repo: (1) the diner-facing web app for discovery, menus, and ordering; (2) the Brivia internal portal for reviewing drafts and publishing to the live app.

### Route Map

| Route | Who | State | Data source |
|---|---|---|---|
| `/` | Diners | ✅ Live | DB + AMap API |
| `/r/[restaurantId]` | Diners | ✅ Live | DB working tables |
| `/m/[menuId]` | Diners | ✅ Live | DB published snapshots |
| `/r/[restaurantId]/cart` | Diners | ✅ Live | localStorage only |
| `/r/[restaurantId]/show` | Diners | ✅ Live | localStorage only |
| `/portal` | Brivia team | ✅ Live | DB |
| `/portal/[restaurantId]` | Brivia team | ✅ Live | DB |
| `/portal/login` | Brivia team | ✅ Live | Token cookie |

### Diner-Facing App

**Home (`/`):** Three views (Map / List / Saved) in a tab bar.
- **Map view:** AMap JS API with markers. Clicking a marker slides up a `RestaurantPreview` card (address, hours, phone, ratings, CTAs). Two marker types: "Brivia menu" (gold) and "AMap POI" (grey).
- **List view:** 2-column grid, sorted by portal-assigned categories as scroll sections. Category filter pill → bottom sheet.
- **Saved view:** localStorage-persisted liked restaurants, same grid.
- **Data:** `GET /api/map/restaurants?cityId=` merges published Brivia restaurants (from DB) with AMap POI discovery candidates. AMap POIs are searched by city-specific cuisine keywords, cached in `amap_restaurant_pois` table (24h TTL), optionally translated via OpenAI.
- **Cities:** Hangzhou, Shanghai, Beijing, Guangzhou, Chengdu, Chongqing. Each has a hand-written food intro paragraph.
- **Fallback:** Mock Hangzhou data shown if DB returns nothing for that city.

**Restaurant detail (`/r/[restaurantId]`):** Reads from working tables. Bilingual name (copy button on Chinese for AMap navigation), address, hours, cuisine tags, about. Links to menu.

**Menu (`/m/[menuId]`):** Reads exclusively from immutable published snapshots. Per-dish inline expand: Key Ingredients → Spice Level → Allergens (with confidence badge) → Dietary Flags → Variations (single/multi select, price delta). Add to cart → localStorage. Cart count in header.

**Cart (`/r/[restaurantId]/cart`):** Line items with quantity controls. Dietary alert aggregation across all items (allergens and dietary flags collapsed by type, clickable to scroll to offending dish). Clear-cart confirmation dialog. Links to Show to Server.

**Show to Server (`/r/[restaurantId]/show`):** Read-only, Chinese name primary (so the server can read it), pinyin below, quantities. Designed to be shown to a restaurant server on the phone screen.

### Portal (Internal Tool)

Auth: single shared `PORTAL_ADMIN_TOKEN` env var, SHA-256 hashed as a session cookie. No user accounts. Implementation: `src/lib/portal-session.ts`.

Per-restaurant portal (`/portal/[restaurantId]`) sections:

1. **Cover photo** — Upload via Supabase Storage. Vertical crop slider (stored in `poi_external_ids->>'crop_position'`).
2. **Restaurant info** — English name, Chinese name (read-only from intake), tagline, about, address, phone, hours, cuisine tags, GCJ-02 geo coordinates.
3. **AMap POI enrichment** — Search AMap by restaurant name, review candidates, apply a verified POI to populate coordinates, hours, phone, tags, photos.
4. **City & Category** — Dropdown with inline "create new" for both fields. Category is what drives the filter pill and list sections in the diner app.
5. **Dish sections** — Drag-and-drop ordering of dishes within and across sections.
6. **Dish cards** — Expand to edit: English clarity name, pinyin (romanized name), one-line story, price (or 市价), spice level, cooking methods, allergens, dietary flags. Save and delete.
7. **Publish** — Validates then creates an immutable `menu_snapshot` + `dish_snapshots` and updates the `published_menus.current_snapshot_id` pointer. Rollback = pointer swap.

### Database — 4-Layer Design

| Layer | Tables | Rule |
|---|---|---|
| A: Working | `restaurants`, `menus`, `dishes`, `dish_ingredients`, `media`, `qr_codes`, `change_logs`, `categories` | Internal only — never exposed to diners |
| B: Snapshots | `menu_snapshots`, `dish_snapshots`, `snapshot_media`, `published_menus` | Immutable — public menus served ONLY from snapshots |
| C: Raw Intake | `raw_submissions`, `raw_submission_files` | Chinese-only, preserved as-is from Jinshuju |
| D: AI Queue | `ai_jobs`, `ai_job_results` | Async AI processing queue (not yet in active use) |
| AMap Cache | `amap_restaurant_pois` (migration 004) | POI discovery cache, 24h TTL, linked to `restaurants` via `amap_poi_id` |

**Publishing workflow:** All dishes must have `status='published'` and `review_status='approved'` → create `menu_snapshot` + `dish_snapshots` → update `published_menus.current_snapshot_id`. Rollback is a pointer swap — no data deletion.

**Bilingual field convention:** `*_native` = Chinese (from intake), `*_en` = English (added by Brivia).

### API Routes

**Public (diner-facing):**
- `GET /api/restaurants/[id]` — restaurant detail from working tables
- `GET /api/menus/[id]` — published menu + dishes from snapshots
- `GET /api/map/restaurants?cityId=` — merged Brivia + AMap discovery feed

**Portal (internal):**
- `GET/PATCH /api/portal/restaurants/[id]` — restaurant read/edit
- `GET /api/portal/restaurants` — list all restaurants for portal index
- `POST /api/portal/restaurants/[id]/publish` — create snapshot, go live
- `POST /api/portal/restaurants/[id]/cover` / `PATCH` — upload / crop cover
- `POST /api/portal/restaurants/[id]/amap-enrich` — AMap POI search + apply
- `PATCH /api/portal/restaurants/[id]/city-category` — set city and category
- `PATCH /api/portal/dishes/[id]` / `DELETE` — edit / delete a dish
- `PATCH /api/portal/menus/[id]/sections` — save section order
- `GET/POST /api/portal/categories` — list / create categories
- `GET /api/portal/cities` — list distinct cities
- `POST /api/portal/login` / `POST /api/portal/logout` — session management

### AMap Integration

- `src/lib/amap-web-service.ts` — server-side AMap REST API client (`/v5/place/text`, `/v5/place/detail`, `/v3/geocode/geo`). Proxy-aware via `undici`. Coordinate system: GCJ-02.
- `src/lib/amap-translation.ts` — OpenAI translation of AMap POI name, address, and tags into English.
- `src/lib/map-restaurants.ts` — combines Brivia DB restaurants and AMap cached POIs into a unified `MapRestaurant` type. Contains scoring, deduplication, and cache write logic.
- `src/components/AMap.tsx` — client-side AMap JS API map component (dynamic import, SSR disabled).

### Brand Tokens (applied across the app)
- Cream: `#fbf9f1` — page backgrounds
- Charcoal: `#1e1e1e` — primary text
- Gold: `#d98f11` — CTAs, active states, nav
- Border: `#d9d9d9` — card borders
- Fonts: Playfair Display (headings), Playfair Display SC (logo wordmark), Kalnia (category pill), DM Sans (body)

### Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/brivia_eats
# or: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_POOL_SIZE

AMAP_WEB_SERVICE_KEY=          # AMap REST API (server-side)
NEXT_PUBLIC_AMAP_JS_KEY=       # AMap JS API (client map)
NEXT_PUBLIC_AMAP_SECURITY_CODE= # AMap JS API security code

PORTAL_ADMIN_TOKEN=            # shared secret for portal auth
OPENAI_API_KEY=                # POI translation (optional, fires when translateLimit > 0)

# Supabase storage (cover photos)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### What's Built vs Not Built

**Built and working:**
- Full diner discovery flow: map + list + saved, city switching, category filter
- Restaurant detail page
- Menu with inline expand, dietary alerts, add-to-cart, variations
- Cart and show-to-server
- Full portal: cover upload, restaurant edit, AMap enrichment, dish editing, drag-and-drop section ordering, publish
- AMap POI discovery and caching
- Portal auth (token-based)
- Database schema (4 layers) and migrations

**Not yet built:**
- QR short-code route resolution (`/qr/[code]`)
- Proper auth (no user accounts, no diner login, portal is single shared token)
- Admin review dashboard with approval checklist
- Full ChangeLog coverage on every portal mutation (partial)
- Full publish-gate enforcement (`ai_status`, `review_status` checks before publish)
- AI draft generation workflows via the queue tables
- Dish image upload (only restaurant cover photo upload is wired)
- Payments / checkout

---

## Shared Engineering Rules (all repos)

- **AI generates drafts only.** No AI output goes to diners without human review. Allergens and ingredients are never guessed and never auto-published.
- **Prefer deterministic pipelines.** LLM calls are isolated to OCR, reasoning, and translation stages. Mapping, writing, and serving are pure code.
- **Idempotency.** Re-running any import or pipeline stage must not duplicate data.
- **Bilingual preservation.** Chinese source fields are always kept alongside English translations — never overwritten.
- **Immutable publish.** Rollback is a pointer swap, not a data delete.
- **Mobile-web-first** for all diner-facing UI.
- **Audit trail.** Every write to the DB should produce a `change_logs` entry (partially enforced; full coverage is deferred).

---

## Data Contracts Between Repos

The Menu Pipeline writes to the same PostgreSQL database that the MVP reads. The key contracts:

| Contract | Detail |
|---|---|
| Jinshuju form token | Confirmation form: `p1RGvP`. Both repos use this constant. |
| `raw_submissions.external_id` | Jinshuju serial number. Used for idempotency. |
| `dishes.status` | Pipeline writes `draft`. Portal sets to `published` on approve. |
| `dishes.review_status` | Pipeline writes `draft`. Portal updates to `approved`. |
| `dishes.ai_status` | Pipeline writes `drafted`. Future: portal sets `approved`. |
| `published_menus.current_snapshot_id` | Pointer to the active snapshot. Diner app reads this. |
| `amap_poi_id` in `restaurants.poi_external_ids` | Stored as `{"gaode": {"poi_id": "..."}}`. Used to link Brivia restaurants to AMap POIs. |

---

## Local Development Setup

Each repo has its own Python venv or `node_modules`. They share the same PostgreSQL database.

```
# 1. Start the MVP (Next.js)
cd "Brivia Eats MVP"
npm install
npm run dev          # localhost:3000

# 2. Run DB migrations (first time only)
psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
psql $DATABASE_URL -f db/migrations/002_add_contains_lamb.sql
psql $DATABASE_URL -f db/migrations/003_add_category.sql
psql $DATABASE_URL -f db/migrations/004_add_amap_restaurant_pois.sql

# 3. Intake Agent (optional, only needed for new restaurant onboarding)
cd "Brivia eats restaurant intake agent"
pip install -r requirements.txt
uvicorn src.app.main:app --reload --port 8000

# 4. Menu Pipeline (run after a restaurant confirms their Jinshuju form)
cd "brivia eats menu pipeline"
pip install -r requirements.txt
python -m src.pipeline.run_import --list         # see what's ready
python -m src.pipeline.run_import --serial 14   # import a specific entry
```
