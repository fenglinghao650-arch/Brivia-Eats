# Brivia Eats Database

## Overview

The database is organized into four layers with **bilingual support**:

**Data Flow:**
```
Raw Intake (Chinese only) → Working Tables (bilingual) → Snapshots (bilingual)
```

- **Raw intake**: Stores original Chinese submissions from restaurants
- **Working tables**: Brivia adds English interpretations
- **Snapshots**: Published bilingual content frozen for display

| Layer | Purpose | Tables |
|-------|---------|--------|
| **A: Working** | Editable canonical entities | `restaurants`, `menus`, `dishes`, `dish_ingredients`, `media`, `qr_codes`, `change_logs`, `reviews` |
| **B: Snapshots** | Immutable published versions | `menu_snapshots`, `dish_snapshots`, `snapshot_media`, `published_menus` |
| **C: Raw Intake** | Original submission archive | `raw_submissions`, `raw_submission_files` |
| **D: AI Queue** | Async AI processing | `ai_jobs`, `ai_job_results` |

## Key Principles

1. **Public menus are served ONLY from snapshots** - never from working tables
2. **Snapshots are immutable** - once created, never modified
3. **Rollback = pointer switch** - change `published_menus.current_snapshot_id`
4. **Drafts never leak** - working tables are for internal use only

## Quick Start

### Prerequisites
- PostgreSQL 14+
- `psql` command-line tool

### Run Migrations

```bash
# Using DATABASE_URL
npm run db:migrate

# Local development
npm run db:migrate:local
```

### Environment Variables

```bash
# Connection string (preferred)
DATABASE_URL=postgresql://user:password@localhost:5432/brivia_eats

# Or individual variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brivia_eats
DB_USER=postgres
DB_PASSWORD=
DB_POOL_SIZE=10
```

## Schema Diagram (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WORKING LAYER (Mutable)                            │
│                                                                             │
│  restaurants ──1:N──► menus ──1:N──► dishes ──1:N──► dish_ingredients      │
│       │                                 │                                   │
│       └────────► qr_codes               └────────► media (polymorphic)     │
│                                                                             │
│  change_logs ◄──── (audit trail for all mutations)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ PUBLISH (snapshot)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SNAPSHOT LAYER (Immutable)                           │
│                                                                             │
│  menu_snapshots ──1:N──► dish_snapshots                                    │
│       │                                                                     │
│       └──1:N──► snapshot_media                                             │
│       │                                                                     │
│       ▼                                                                     │
│  published_menus ◄── current_snapshot_id pointer (rollback target)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Publish Workflow

1. Validate all dishes have `status='published'` and `review_status='approved'`
2. Create `menu_snapshot` with frozen restaurant + menu data
3. Create `dish_snapshot` for each dish (denormalized)
4. Create `snapshot_media` for all media references
5. Update `published_menus.current_snapshot_id`

## Rollback

```sql
-- Rollback to version 3
UPDATE published_menus 
SET current_snapshot_id = (
    SELECT id FROM menu_snapshots 
    WHERE restaurant_id = 'xxx' AND version = 3
)
WHERE restaurant_id = 'xxx';
```

## Bilingual Field Naming Convention

| Field Pattern | Example | Description |
|---------------|---------|-------------|
| `*_native` | `name_native`, `title_native` | Chinese/native script (from intake) |
| `*_en` | `name_en`, `title_en` | English (added by Brivia) |

### MenuSection JSONB Structure

```json
{
  "id": "sec_cold",
  "title_native": "冷菜",
  "title_en": "Cold Dishes",
  "description_native": null,
  "description_en": null,
  "dish_ids": ["dish_1", "dish_2"],
  "sort_order": 1
}
```

## Files

- `migrations/001_initial_schema.sql` - Initial schema DDL (includes bilingual fields)
