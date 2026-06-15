# Yunshan (云山竺院) seasonal drink rotation

云山竺院 rotates its drink menu by season while the food stays the same. The menu
ID is fixed, so the **printed QR code keeps working** across seasons (Approach A —
one menu, re-published as new snapshots).

## Datasets

- `yunshan-drinks-winter.json` — the original/winter drinks (single "Drinks" section), extracted from snapshot v3
- `yunshan-drinks-summer.json` — the summer drinks (Jinshuju entry #33), split into Tea / Fruit Tea / Non-Alcoholic / Coffee, currently live (snapshot v4)

Each file carries full dish data — name, pinyin, English name, story, price,
allergens + confidence, dietary flags, brew method, and ingredients — so rotating
needs **no OpenAI/translation** at run time.

## Rotate

```bash
npx tsx scripts/rotate-yunshan-drinks.ts winter   # swap drinks to winter, republish
npx tsx scripts/rotate-yunshan-drinks.ts summer   # swap drinks to summer, republish
```

This replaces **only** the drink sections and republishes a new snapshot; food
sections are untouched. Safe to re-run (it always replaces drinks with the
dataset). If translated (JA/KO/ES) menus exist, regenerate them from the portal
after rotating.

## Add a new season

Copy one of the JSON files, edit the `season` field and the drinks, then:

```bash
npx tsx scripts/rotate-yunshan-drinks.ts ./scripts/seasonal/yunshan-drinks-<new>.json
```

## Instant rollback (alternative)

Every publish is an immutable snapshot. Winter = v3, summer = v4. Rolling the
`published_menus.current_snapshot_id` pointer back to a prior version restores it
exactly, with no data re-insertion.
