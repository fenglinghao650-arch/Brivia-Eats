# Brivia MVP — AI Coding Agent Build Spec (SPEC.md)

Version: 1.1.1
Schema version: v1.1.1 (see brivia_schema_v1_1_1.json)
Last updated: 2026-01-16

Status: Authoritative build specification
Audience: AI coding agents (Cursor / Claude Code) + engineers

This document is authoritative. Follow it exactly.
Do not add features outside Non-Goals.

---

## 0) Golden Rules (Do Not Violate)

1. QR codes must always resolve to the latest **published** main menu.
2. Ordering must happen on the menu page using **inline expand** (no dish pages).
3. No payments, no checkout, no diner accounts.
4. Restaurant edits to safety-critical fields must trigger **pending review**.
5. Only **approved** dishes and menus can be published.
6. Every write operation must generate a **ChangeLog** entry.
7. Every dish must follow the **Brivia 3-layer naming system**.
8. Cart must generate **aggregated dietary alerts** before “Show to server”.
9. Media must use the **Media table with semantic roles**.
10. AI may draft only; **humans publish**.

---

## 1) Product Surfaces & Routes

### 1.1 Diner (Public, No Login)

- `/q/:shortCode` → resolve QR → redirect to menu
- `/m/:menuId` → menu page (browse + order)
- `/r/:restaurantId` → restaurant home
- `/r/:restaurantId/cart` → cart + dietary alert
- `/r/:restaurantId/show` → show-to-server

### 1.2 Restaurant Portal (Auth Required)

- `/portal/login`
- `/portal/r/:restaurantId` → edit restaurant
- `/portal/m/:menuId` → edit menu structure
- `/portal/d/:dishId` → edit dish raw truth

### 1.3 Admin Review (Brivia Internal)

- `/admin/review-queue?type=dish|menu`
- `/admin/dish/:dishId`
- `/admin/menu/:menuId`

---

## 2) Data Model (Authoritative)

Use the **Brivia canonical schema v1.1.1** exactly (see `brivia_schema_v1_1_1.json`).

Required entities:
- Restaurant
- Menu
- Dish
- Media
- QRCode
- ChangeLog

### 2.1 Menus (Source of Truth)

Menus are stored **only in the database**.
- No static menu JSON files.
- Public rendering always uses **published DB state**.

### 2.2 Safety-Critical Dish Fields

If any of the following fields change, the dish must enter `pending_review`:

- `core_ingredients`
- `cooking_methods`
- `allergens`
- `dietary_flags`
- `variations`

### 2.3 Publishing Rules

- Dish can be `published` only if `review_status = approved` AND `ai_status = approved`
- Menu can be `published` only if all referenced dishes are `published`
- QR routes must never expose draft or pending content

---

## 3) API Surface (Minimum Required)

### 3.1 Public APIs

- `GET /api/public/qr/:shortCode`
- `GET /api/public/restaurants/:id`
- `GET /api/public/restaurants/:id/main-menu`
- `GET /api/public/menus/:id`
- `POST /api/public/dishes/bulk-get`
- `POST /api/public/media/bulk-get`

### 3.2 Restaurant Portal APIs

- `PATCH /api/portal/restaurants/:id`
- `PATCH /api/portal/menus/:id`
- `PATCH /api/portal/dishes/:id`
  - must detect safety-critical changes
  - must set `status = pending_review`

### 3.3 Media Upload APIs

- `POST /api/portal/media/upload-intent`
- `POST /api/portal/media/:id/confirm`
- `POST /api/portal/media/:id/set-primary`

### 3.4 Admin APIs

- `GET /api/admin/review-queue`
- `POST /api/admin/dishes/:id/generate-draft`
- `POST /api/admin/dishes/:id/approve`
- `POST /api/admin/menus/:id/approve`

---

## 4) UI Requirements (Must Match)

### 4.1 Menu Page

Each dish row must show:
- Romanized name (primary)
- Clarity name (secondary)
- One-line story (visually secondary)

Interactions:
- Tap row → inline expand (ingredients, allergens, variations)
- Add-to-cart button always visible

### 4.2 Cart

- List of selected items
- Aggregated dietary alerts with “triggered by” mapping
- “Show to server” CTA

### 4.3 Show-to-Server

- Native dish names + native variation names
- Quantity
- Restaurant name prominently displayed

---

## 5) Non-Goals (Explicitly Forbidden)

Do NOT implement:
- Payments or checkout
- Diner accounts or login
- Reviews or ratings UI
- Discovery feeds or search
- City browsing
- Menu scraping
- Native apps
- Push notifications

---

## 6) Implementation Rules

- Separate domain logic from UI logic
- Core logic must not depend on browser APIs
- All mutations must go through a ChangeLog writer
- Dietary alert aggregation must be unit-tested

---

## 7) Internal AI Interpretation & Review Workflow (Authoritative)

### 7.1 Core Principle

AI drafts **interpretive layers only**.
AI never asserts or modifies safety truth.

---

### 7.2 Fields AI May Write

AI may generate/update ONLY:

- `romanized_name`
- `clarity_name_en`
- `one_line_story_en`
- `flavor_profile_tags` (optional)

AI must NOT modify:

- `core_ingredients`
- `cooking_methods`
- `allergens`
- `dietary_flags`
- `variations`
- `price`
- `availability`

---

### 7.3 Required AI Status Field

Each Dish must track:

```ts
ai_status: "not_started" | "drafted" | "approved"
```

Publishing requires `ai_status = approved`.

---

### 7.4 AI Draft Generation

**Manual trigger only** (admin action). No background jobs or automatic drafting on save.

**Endpoint**
```
POST /api/admin/dishes/:id/generate-draft
```

**Input**
- native_name
- core_ingredients (names only)
- cooking_methods
- restaurant.city
- restaurant.cuisine_tags (if any)

**Output (strict JSON)**
```json
{
  "romanized_name": "...",
  "clarity_name_en": "...",
  "one_line_story_en": "...",
  "flavor_profile_tags": ["..."],
  "uncertainties": ["..."]
}
```

`uncertainties` must always be present.

---

### 7.5 System Behavior After Draft

- Write AI fields to Dish
- Store `uncertainties` as internal notes (not user-visible)
- Set `ai_status = drafted`
- Write ChangeLog entry

Dish remains `pending_review`.

---

### 7.6 Human Review Checklist (Blocking)

Reviewer must confirm:
- Interpretive names match ingredients
- Clarity name sets correct expectations
- Story avoids unverified claims
- Allergens complete or explicitly unknown
- Variations do not introduce hidden allergens

Approval must be blocked until checklist is complete.

---

### 7.7 Dish Approval

**Endpoint**
```
POST /api/admin/dishes/:id/approve
```

System must:
- verify required fields
- verify `ai_status = drafted`
- set:
  - `ai_status = approved`
  - `review_status = approved`
  - `status = published`
- stamp reviewer + time
- write ChangeLog

---

### 7.8 Menu Approval Dependency

Menu approval must fail if any referenced dish:
- is not published, OR
- has `ai_status != approved`

---

### 7.9 Explicit Non-Goals for AI

Do NOT implement:
- autonomous agents
- background auto-drafting
- retrieval or web search
- self-approval
- multi-step reasoning loops

AI is a **manual, single-shot draft generator**.

---

## 8) Acceptance Checklist (Ship Gate)

- QR reliably opens published menu
- Menu renders correctly on mobile
- Inline expand works
- Cart + dietary alerts work
- Show-to-server view works
- Review gate enforced
- ChangeLog written for every write

---

## 9) Engineering Principle (Canonical)

Brivia does not optimize for AI wow.
Brivia optimizes for **ordering confidence under social pressure**.
