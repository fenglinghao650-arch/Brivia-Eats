# Brivia Eats — Inline Expand Specification (Canonical)

Inline Expand is the **decision-support layer** of Brivia Eats.
It exists to help users make an order decision safely:

> “Can I eat this?”  
> “What choices do I need to make?”

Inline Expand is **not** for education, storytelling, or discovery.

---

## 1. Purpose of Inline Expand

Inline Expand exists to:
- reduce ordering anxiety under social pressure
- surface safety-critical information
- prevent ordering mistakes
- support culturally diverse dietary constraints

It must work when:
- Chinese is not the user’s first language
- the user has dietary or religious restrictions

---

## 2. What Inline Expand Includes (MVP Only)

Inline Expand includes **only variables that affect ordering safety or choice**.

### Included Variables (MVP Locked)

1. Key Ingredients  
2. Spice Level  
3. Allergens  
4. Dietary Flags  
5. Variations  

No other information belongs here.

---

## 3. Variable Definitions & Rules

### 3.1 Key Ingredients

**Purpose**
- Reduce taste uncertainty

**Definition**
A short list of **core ingredients** that materially affect:
- flavor
- texture
- dietary suitability

**Rules**
- Human-readable
- Ordered by prominence (main → secondary)
- Do NOT list every seasoning
- If information is incomplete or unverified, it must be explicitly stated

**Display**

---

### 3.2 Spice Level

**Purpose**
- Reduce anxiety for spice-sensitive users
- Maintain consistency across cuisines

**Enum (MVP Locked)**
- Not spicy
- Mild
- Medium
- Spicy

**Rules**
- Always explicitly set
- Single-select
- Never inferred by AI

**Display**

---

### 3.3 Allergens

**Purpose**
- Safety-critical disclosure

**Core Allergen Set (MVP)**
- Gluten (wheat)
- Soy
- Peanuts
- Tree nuts
- Dairy
- Egg
- Fish
- Shellfish
- Sesame

**Confidence**
Each dish must be either:
- Confirmed
- Not fully confirmed

**Rules**
- Allergens must be listed or explicitly marked unknown
- Never inferred
- Never hidden

**Display (Confirmed)**

**Display (Unconfirmed)**

---

### 3.4 Dietary Flags

Dietary flags are **summaries**, not ingredient lists.

They exist to provide **fast rule-out signals**.

#### 3.4.1 Identity-Based Dietary Flags  
(High confidence only)

These are **promises** and must be explicitly confirmed by the restaurant.

- Vegetarian  
- Vegan  
- Halal (explicit confirmation only)

**Rules**
- Never inferred
- Absence ≠ confirmation
- If uncertain, do not show

---

#### 3.4.2 Content-Based Dietary Flags  
(Factual ingredient implications)

These are **ingredient truths**, not lifestyle labels.

- Contains pork
- Contains beef
- Contains poultry
- Contains seafood
- Contains alcohol

**Rules**
- Shown whenever applicable
- Derived from confirmed ingredients
- Always factual

---

**Display Example**

**Fallback**

---

### 3.5 Variations

**Purpose**
- Prevent ordering mistakes
- Reflect real restaurant options

Variations affect **what arrives at the table**.

---

#### 3.5.1 Default Stock Variation Categories (MVP)

These are expected system-wide:

- Spice level  
- Quantity / portion  
- Add-ons (limited)

**Rules**
- Selectable only (no free text)
- Must have defaults
- Must re-trigger allergen & dietary evaluation if relevant

---

#### 3.5.2 Custom Variation Categories (Restaurant-Defined)

Restaurants may add custom categories, such as:
- Sugar level
- Ice level
- Sauce on the side
- Noodle type

**Rules**
- Explicitly named by restaurant
- Selectable only
- Cannot override safety logic

---

## 4. Display Order (Locked)

When expanded, variables must appear in this order:

1. Key Ingredients  
2. Spice Level  
3. Allergens (visually emphasized)  
4. Dietary Flags  
5. Variations  


---

## 5. Interaction Rules

- Inline Expand does NOT navigate away from the menu page
- Add-to-cart must remain visible at all times
- No scrolling traps inside expand
- Expand/collapse must be fast and reversible

---

## 7. Canonical Brivia Principle

> **Inline Expand answers:  
> “Can I eat this?” and “What do I need to choose?”  

This principle supersedes all future feature requests.
