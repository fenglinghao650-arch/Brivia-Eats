# Brivia Eats — Unified Product Requirements Document (PRD)

**Version:** 1.1.1 (Unified for Execution)  
**Status:** Authoritative product definition for Cursor / AI coding agents  
**Owner:** Brivia  
**Last updated:** 2026-01-16  

---

## Authority & Usage

This PRD is unified, complete, and execution-ready.

It is intended to be used **together with**:
- the canonical schema
- `SPEC.md`

**Conflict resolution order (strict):**  
**Schema → SPEC → PRD**

The PRD provides intent, scope, and product philosophy.  
Behavioral and technical rules are enforced by the schema and SPEC.

---

## 1. Product Overview

**Brivia Eats** is a **QR-based, mobile-web-first menu interpretation infrastructure** for international travelers.

**In-product tagline:**  
> *“Menu empowered by Brivia”*

### Brivia is NOT:
- a translation tool  
- a review platform  
- a payment or ordering system  

### Brivia IS:
- a cultural interpretation layer for food ordering  
- infrastructure that reduces uncertainty under social pressure  

---

## 2. Problem Statement

International travelers experience high anxiety when ordering unfamiliar local food due to:

- literal but misleading translations  
- loss of cultural meaning  
- unclear ingredients, cooking methods, and allergens  
- social pressure during in-person ordering  

Existing solutions oversimplify, over-translate, or prioritize discovery, reviews, and payments—rather than **ordering confidence**.

---

## 3. Core Insight

Differences in menu translation strategies are driven by **familiarity, trust, brand recognition, and perceived safety**—not culture itself.

When food is unfamiliar, **clarity and expectation-setting must come first**, without erasing cultural identity.

---

## 4. Product Definition

Brivia Eats is a **cultural interpretation infrastructure** for food ordering.

It:
- preserves cultural dish identity  
- reduces uncertainty at the moment of ordering  
- provides **human-reviewed** safety information  
- works inside restaurants via QR codes  
- does **not** replace restaurant ordering systems  

---

## 5. Target Users

- **Primary:** International travelers (English-speaking in MVP)
- **Secondary:** Restaurants inputting raw menu truth
- **Internal:** Brivia reviewers verifying safety and approving interpretation

---

## 6. Core User Flow (MVP)

**Scan QR → Mobile web menu → Browse dishes → Add to cart → View dietary alerts → Show to server**

Constraints:
- No payments  
- No checkout  
- No diner accounts  

---

## 7. Core UX Principles

- Ordering confidence over exploration  
- Clarity always visible; story is optional  
- No forced navigation to order  
- Never rush the user  
- Trust > AI novelty  
- Infrastructure feel, not “AI app” feel  

---

## 8. Brivia 3-Layer Naming System

### Layer 1 — Cultural Anchor
- Romanized original name  
- Native script available  

### Layer 2 — Ordering Clarity
- Plain-English description  
- Ingredients, cooking method, and flavor  

### Layer 3 — Cultural / Sensory Story
- One-line explanation  
- Optional and expandable  

---

## 9. Feature Scope (MVP)

### Diner
- QR entry
- Restaurant home
- Menu list with inline expand
- Add-to-cart
- Dietary alert aggregation
- Show-to-server view

### Restaurant
- Portal for menu and dish input
- Photo upload (semantic media roles)
- Variation configuration
- Submit updates for review

### Internal (Brivia)
- Review gate for safety-critical fields
- AI-drafted interpretation
- Human approval workflow
- Audit log (ChangeLog)

---

## 10. Explicit Non-Goals

The MVP must **NOT** include:

- payments or checkout  
- diner accounts or login  
- reviews or ratings UI  
- discovery feeds or search  
- city browsing  
- menu scraping  
- loyalty programs  
- native mobile apps  

---

## 11. Data & System Requirements

- Relational schema (menus → dishes → ingredients)
- Menus stored **only** in the database
- Media stored separately with semantic roles
- Audit log instead of full revision tables
- Deterministic publish rules

---

## 12. AI System Design

AI:
- drafts **interpretive layers only**
- never infers allergens or ingredients
- never auto-publishes  

**Human review is mandatory** before publishing any content.

---

## 13. Success Metrics

### Quantitative
- Dish expand rate
- Cart completion rate
- Dietary alert frequency

### Qualitative
- Reduced ordering confusion
- Restaurant satisfaction
- Reviewer confidence

---

## 14. Risks & Mitigations

- **Over-engineering** → strict non-goals  
- **AI hallucination** → human review + confidence flags  
- **Scope creep** → PRD + SPEC as gatekeepers  
- **Restaurant data errors** → review gate + audit log  

---

## 15. Product Philosophy (Canonical)

Brivia does **not** optimize for AI wow.  
Brivia optimizes for **ordering confidence under social pressure**.

**This principle supersedes all feature decisions.**
