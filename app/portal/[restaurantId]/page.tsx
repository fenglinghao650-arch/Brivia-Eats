"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import { useParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type SpiceLevel = "not_spicy" | "mild" | "medium" | "spicy";

const SPICE_OPTIONS: SpiceLevel[] = ["not_spicy", "mild", "medium", "spicy"];
const SPICE_LABELS: Record<SpiceLevel, string> = {
  not_spicy: "Not spicy", mild: "Mild", medium: "Medium", spicy: "Spicy",
};

const ALLERGEN_OPTIONS = [
  "gluten_wheat", "soy", "peanuts", "tree_nuts",
  "dairy", "egg", "fish", "shellfish", "sesame",
];
const DIETARY_OPTIONS = [
  "vegetarian", "vegan", "halal", "contains_pork", "contains_beef",
  "contains_lamb", "contains_poultry", "contains_seafood", "contains_alcohol",
];

const TAG_LABELS: Record<string, string> = {
  gluten_wheat: "Gluten", soy: "Soy", peanuts: "Peanuts", tree_nuts: "Tree nuts",
  dairy: "Dairy", egg: "Egg", fish: "Fish", shellfish: "Shellfish", sesame: "Sesame",
  vegetarian: "Vegetarian", vegan: "Vegan", halal: "Halal",
  contains_pork: "Pork", contains_beef: "Beef", contains_lamb: "Lamb",
  contains_poultry: "Poultry", contains_seafood: "Seafood", contains_alcohol: "Alcohol",
};

type Dish = {
  id: string;
  native_name: string;
  romanized_name: string;
  clarity_name_en: string;
  one_line_story_en: string;
  price: number | null;
  currency: string;
  spice_level: SpiceLevel;
  allergens: string[];
  dietary_flags: string[];
  cooking_methods: string[];
  review_status: string;
};

type MenuSection = {
  id: string;
  title_native: string;
  title_en: string;
  dish_ids: string[];
  sort_order: number;
};

type Menu = {
  id: string;
  title_en: string;
  sections: MenuSection[];
  status: string;
};

type Category = {
  id: string;
  name: string;
};

type Restaurant = {
  id: string;
  name_native: string;
  name_en: string | null;
  city: string;
  area: string | null;
  address_native: string;
  address_en: string | null;
  phone: string | null;
  hours_text: string | null;
  tagline_en: string | null;
  cuisine_tags: string[];
  about_short_en: string;
  geo_lat: number | null;
  geo_lng: number | null;
  cover_photo_url: string | null;
  crop_position: string | null;
  category_id: string | null;
};

type PortalData = {
  restaurant: Restaurant;
  menu: Menu;
  dishes: Dish[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function TagPicker({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              selected.includes(opt)
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            {TAG_LABELS[opt] ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function DropLine({ show }: { show: boolean }) {
  return (
    <div className={`h-0.5 mx-1 rounded-full transition-all duration-100 ${show ? "bg-zinc-900 my-1" : "bg-transparent my-0"}`} />
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        {value || <span className="text-zinc-300">—</span>}
      </div>
    </div>
  );
}

function EditableField({
  label, value, multiline, onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      {multiline ? (
        <textarea
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ── Dish card ─────────────────────────────────────────────────────────────────

function DishCard({
  dish: initial,
  sectionId,
  dishIndex,
  onSave,
  onDelete,
  onDragStart,
  onDragOverDish,
}: {
  dish: Dish;
  sectionId: string;
  dishIndex: number;
  onSave: (id: string, updates: Partial<Dish>) => Promise<string | null>;
  onDelete: (dishId: string, sectionId: string) => Promise<void>;
  onDragStart: (dishId: string, fromSectionId: string, fromIndex: number) => void;
  onDragOverDish: (sectionId: string, insertIndex: number) => void;
}) {
  const [dish, setDish] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const update = <K extends keyof Dish>(key: K, value: Dish[K]) => {
    setDish((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const error = await onSave(dish.id, {
      clarity_name_en: dish.clarity_name_en,
      romanized_name: dish.romanized_name,
      one_line_story_en: dish.one_line_story_en,
      price: dish.price,
      spice_level: dish.spice_level,
      allergens: dish.allergens,
      dietary_flags: dish.dietary_flags,
      cooking_methods: dish.cooking_methods,
    });
    setSaving(false);
    if (error) {
      alert(`Save failed: ${error}`);
    } else {
      setSaved(true);
      setDirty(false);
    }
  };

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white flex flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation(); // prevent section handler from overriding
        const rect = e.currentTarget.getBoundingClientRect();
        const insertIndex = e.clientY < rect.top + rect.height / 2 ? dishIndex : dishIndex + 1;
        onDragOverDish(sectionId, insertIndex);
      }}
    >
      {/* Top row: expand button + drag handle */}
      <div className="flex items-stretch">
        {/* Expand/collapse — takes up all space except the drag handle */}
        <button
          className="flex flex-1 items-start justify-between px-4 py-3 text-left min-w-0"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold">{dish.clarity_name_en}</span>
              <span className="text-sm text-zinc-400">{dish.native_name}</span>
            </div>
            <div className="mt-0.5 text-xs text-zinc-400">{dish.romanized_name}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-sm font-medium text-zinc-600">
              {dish.price != null ? `¥${dish.price}` : <span className="text-zinc-400 italic">市价</span>}
            </span>
            <span className="text-zinc-300 text-sm">{expanded ? "▲" : "▼"}</span>
          </div>
        </button>

        {/* Drag handle — outside the button so click doesn't expand */}
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            onDragStart(dish.id, sectionId, dishIndex);
          }}
          className="flex items-center px-3 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 select-none border-l border-zinc-100"
          title="Drag to move to a different section"
        >
          ⠿
        </div>
      </div>

      {/* Expanded edit form */}
      {expanded && (
        <div className="space-y-4 border-t border-zinc-100 px-4 py-4">
          <EditableField
            label="English name"
            value={dish.clarity_name_en}
            onChange={(v) => update("clarity_name_en", v)}
          />
          <EditableField
            label="Pinyin"
            value={dish.romanized_name}
            onChange={(v) => update("romanized_name", v)}
          />
          <EditableField
            label="One-line story"
            value={dish.one_line_story_en}
            multiline
            onChange={(v) => update("one_line_story_en", v)}
          />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Price
            </label>
            <div className="flex items-center gap-3">
              {dish.price == null ? (
                <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 italic">
                  市价 / Market price
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-zinc-500">¥</span>
                  <input
                    type="number"
                    className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                    value={dish.price}
                    onChange={(e) => update("price", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => update("price", dish.price == null ? 0 : null)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 hover:border-zinc-400 transition-colors"
              >
                {dish.price == null ? "Set price" : "Mark as 市价"}
              </button>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">Spice</div>
            <div className="flex gap-2">
              {SPICE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => update("spice_level", opt)}
                  className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
                    dish.spice_level === opt
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                  }`}
                >
                  {SPICE_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Cooking methods (comma-separated)
            </label>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              value={(dish.cooking_methods ?? []).join(", ")}
              onChange={(e) => {
                const methods = e.target.value.split(",").map((m) => m.trim()).filter(Boolean);
                update("cooking_methods", methods);
              }}
            />
          </div>
          <TagPicker
            label="Allergens"
            options={ALLERGEN_OPTIONS}
            selected={dish.allergens}
            onChange={(v) => update("allergens", v)}
          />
          <TagPicker
            label="Dietary flags"
            options={DIETARY_OPTIONS}
            selected={dish.dietary_flags}
            onChange={(v) => update("dietary_flags", v)}
          />
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save dish"}
            </button>
            {saved && <span className="text-xs text-green-600">Saved ✓</span>}
            <button
              onClick={async () => {
                if (!confirm(`Delete "${dish.clarity_name_en}"? This cannot be undone.`)) return;
                setDeleting(true);
                await onDelete(dish.id, sectionId);
              }}
              disabled={deleting}
              className="ml-auto rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortalRestaurantPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  // Editable restaurant fields
  const [restEdits, setRestEdits] = useState<Record<string, unknown>>({});
  const [restSaving, setRestSaving] = useState(false);
  const [restSaved, setRestSaved] = useState(false);

  // Cover photo
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState("50");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sections (stateful for drag-and-drop)
  const [sections, setSections] = useState<MenuSection[]>([]);
  const dragRef = useRef<{ dishId: string; fromSectionId: string; fromIndex: number } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ sectionId: string; index: number } | null>(null);
  const [, startSaveSections] = useTransition();

  // City & Category
  const [cityEdit, setCityEdit] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [showNewCity, setShowNewCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cityCatSaving, setCityCatSaving] = useState(false);
  const [cityCatSaved, setCityCatSaved] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/restaurants/${restaurantId}`).then((r) => r.json()),
      fetch(`/api/portal/categories`).then((r) => r.json()),
      fetch(`/api/portal/cities`).then((r) => r.json()),
    ]).then(([d, cats, cityList]: [PortalData, Category[], string[]]) => {
      setData(d);
      setCoverUrl(d.restaurant.cover_photo_url ?? null);
      setCropPosition(d.restaurant.crop_position ?? "50");
      setCityEdit(d.restaurant.city ?? "");
      setCategoryId(d.restaurant.category_id ?? null);
      setCategories(Array.isArray(cats) ? cats : []);
      setCities(Array.isArray(cityList) ? cityList : []);
      setSections([...(d.menu.sections ?? [])].sort((a, b) => a.sort_order - b.sort_order));
      setRestEdits({
        name_native: d.restaurant.name_native ?? "",
        name_en: d.restaurant.name_en ?? "",
        address_en: d.restaurant.address_en ?? "",
        tagline_en: d.restaurant.tagline_en ?? "",
        about_short_en: d.restaurant.about_short_en,
        cuisine_tags: d.restaurant.cuisine_tags,
        phone: d.restaurant.phone ?? "",
        hours_text: d.restaurant.hours_text ?? "",
        geo_lat: d.restaurant.geo_lat != null ? String(d.restaurant.geo_lat) : "",
        geo_lng: d.restaurant.geo_lng != null ? String(d.restaurant.geo_lng) : "",
      });
    }).finally(() => setLoading(false));
  }, [restaurantId]);

  const handleSaveDish = useCallback(async (id: string, updates: Partial<Dish>): Promise<string | null> => {
    const res = await fetch(`/api/portal/dishes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return json.error ?? res.statusText;
    }
    return null;
  }, []);

  const handleDeleteDish = useCallback(async (dishId: string, fromSectionId: string) => {
    const res = await fetch(`/api/portal/dishes/${dishId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Delete failed: ${json.error ?? res.statusText}`);
      return;
    }
    // Remove from local sections state so UI updates immediately
    setSections((prev) =>
      prev.map((s) =>
        s.id === fromSectionId
          ? { ...s, dish_ids: s.dish_ids.filter((id) => id !== dishId) }
          : s
      )
    );
    setData((prev) =>
      prev ? { ...prev, dishes: prev.dishes.filter((d) => d.id !== dishId) } : prev
    );
  }, []);

  const handleSaveRestaurant = async () => {
    setRestSaving(true);
    const res = await fetch(`/api/portal/restaurants/${restaurantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restEdits),
    });
    setRestSaving(false);
    if (res.ok) {
      setRestSaved(true);
    } else {
      const json = await res.json().catch(() => ({}));
      alert(`Save failed: ${json.error ?? res.statusText}`);
    }
  };

  const handleUploadCover = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("crop_position", cropPosition);
    const res = await fetch(`/api/portal/restaurants/${restaurantId}/cover`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok) {
      setUploadError(json.error ?? "Upload failed");
    } else {
      setCoverUrl(json.url);
    }
    setUploading(false);
  };

  const handleSaveCrop = async (pos: string) => {
    setCropPosition(pos);
    await fetch(`/api/portal/restaurants/${restaurantId}/cover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop_position: pos }),
    });
  };

  const saveSections = useCallback(async (newSections: MenuSection[]) => {
    if (!data) return;
    await fetch(`/api/portal/menus/${data.menu.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: newSections }),
    });
  }, [data]);

  const handleDishDragStart = useCallback((dishId: string, fromSectionId: string, fromIndex: number) => {
    dragRef.current = { dishId, fromSectionId, fromIndex };
  }, []);

  const handleDrop = useCallback((targetSectionId: string) => {
    const drag = dragRef.current;
    dragRef.current = null;
    const indicator = dropIndicator;
    setDropIndicator(null);
    if (!drag) return;

    const isSameSection = drag.fromSectionId === targetSectionId;

    // Where to insert: use indicator position, or append to end of target
    const rawInsert = indicator?.sectionId === targetSectionId
      ? indicator.index
      : sections.find((s) => s.id === targetSectionId)?.dish_ids.length ?? 0;

    const newSections = sections.map((s) => {
      if (isSameSection && s.id === drag.fromSectionId) {
        // Reorder within same section
        const ids = s.dish_ids.filter((id) => id !== drag.dishId);
        // Adjust index for the removed element
        const insertAt = rawInsert > drag.fromIndex ? rawInsert - 1 : rawInsert;
        ids.splice(Math.min(insertAt, ids.length), 0, drag.dishId);
        return { ...s, dish_ids: ids };
      }
      if (!isSameSection) {
        if (s.id === drag.fromSectionId) {
          return { ...s, dish_ids: s.dish_ids.filter((id) => id !== drag.dishId) };
        }
        if (s.id === targetSectionId) {
          const ids = [...s.dish_ids];
          ids.splice(Math.min(rawInsert, ids.length), 0, drag.dishId);
          return { ...s, dish_ids: ids };
        }
      }
      return s;
    });

    setSections(newSections);
    startSaveSections(() => { saveSections(newSections); });
  }, [sections, dropIndicator, saveSections]);

  const handleSaveCityCategory = async () => {
    setCityCatSaving(true);
    await fetch(`/api/portal/restaurants/${restaurantId}/city-category`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: cityEdit, category_id: categoryId }),
    });
    setCityCatSaving(false);
    setCityCatSaved(true);
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    const res = await fetch(`/api/portal/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    const cat: Category = await res.json();
    setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
    setCategoryId(cat.id);
    setNewCatName("");
    setShowNewCat(false);
    setCreatingCat(false);
    setCityCatSaved(false);
  };

  const handlePublish = async () => {
    if (!confirm("Save all changes and publish this menu to the live app?")) return;
    setPublishing(true);
    setPublishError(null);
    const res = await fetch(`/api/portal/restaurants/${restaurantId}/publish`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setPublishError(json.error ?? "Publish failed");
    } else {
      setPublished(true);
    }
    setPublishing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">
        Restaurant not found.
      </div>
    );
  }

  const { restaurant, dishes } = data;
  const dishMap = new Map(dishes.map((d) => [d.id, d]));
  const cuisineTagsStr = ((restEdits.cuisine_tags as string[]) ?? []).join(", ");

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portal" className="text-sm text-zinc-400 hover:text-zinc-900">
              ← Portal
            </Link>
            <span className="text-zinc-200">/</span>
            <span className="font-semibold">{restaurant.name_en ?? restaurant.name_native}</span>
          </div>
          <button
            onClick={handlePublish}
            disabled={publishing || published}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {publishing ? "Publishing…" : published ? "Published ✓" : "Publish to app"}
          </button>
        </div>
        {publishError && (
          <div className="mx-auto mt-2 max-w-4xl text-sm text-red-600">{publishError}</div>
        )}
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        {/* Cover photo */}
        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Cover photo</div>

          {/* Preview */}
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-zinc-100">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt="Cover"
                fill
                className="object-cover"
                style={{ objectPosition: `center ${cropPosition}%` }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                No cover photo yet
              </div>
            )}
          </div>

          {/* Crop slider — only shown when photo exists */}
          {coverUrl && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                Vertical crop position — {cropPosition}%
                <span className="ml-2 font-normal normal-case text-zinc-300">(0% = top, 100% = bottom)</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={cropPosition}
                onChange={(e) => setCropPosition(e.target.value)}
                onMouseUp={(e) => handleSaveCrop((e.target as HTMLInputElement).value)}
                onTouchEnd={(e) => handleSaveCrop((e.target as HTMLInputElement).value)}
                className="w-full accent-zinc-900"
              />
            </div>
          )}

          {/* Upload button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400 disabled:opacity-40"
            >
              {uploading ? "Uploading…" : coverUrl ? "Replace photo" : "Upload photo"}
            </button>
            {uploadError && <span className="text-xs text-red-500">{uploadError}</span>}
            {coverUrl && !uploading && <span className="text-xs text-zinc-400">Drag slider to adjust crop</span>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadCover(file);
              e.target.value = "";
            }}
          />
        </section>

        {/* Restaurant info */}
        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Restaurant info
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditableField
              label="English name (romanized)"
              value={(restEdits.name_en as string) ?? ""}
              onChange={(v) => { setRestEdits((p) => ({ ...p, name_en: v })); setRestSaved(false); }}
            />
            <EditableField
              label="Chinese name"
              value={(restEdits.name_native as string) ?? ""}
              onChange={(v) => { setRestEdits((p) => ({ ...p, name_native: v })); setRestSaved(false); }}
            />
          </div>

          {/* Tagline */}
          <EditableField
            label="Tagline"
            value={(restEdits.tagline_en as string) ?? ""}
            onChange={(v) => { setRestEdits((p) => ({ ...p, tagline_en: v })); setRestSaved(false); }}
          />

          {/* About */}
          <EditableField
            label="About (English)"
            value={(restEdits.about_short_en as string) ?? ""}
            multiline
            onChange={(v) => { setRestEdits((p) => ({ ...p, about_short_en: v })); setRestSaved(false); }}
          />

          {/* Address */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditableField
              label="Address (English)"
              value={(restEdits.address_en as string) ?? ""}
              onChange={(v) => { setRestEdits((p) => ({ ...p, address_en: v })); setRestSaved(false); }}
            />
            <ReadOnlyField label="Address (Chinese, from intake)" value={restaurant.address_native} />
          </div>

          {/* Contact & hours */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditableField
              label="Phone"
              value={(restEdits.phone as string) ?? ""}
              onChange={(v) => { setRestEdits((p) => ({ ...p, phone: v })); setRestSaved(false); }}
            />
            <EditableField
              label="Opening hours"
              value={(restEdits.hours_text as string) ?? ""}
              onChange={(v) => { setRestEdits((p) => ({ ...p, hours_text: v })); setRestSaved(false); }}
            />
          </div>

          {/* Cuisine tags */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Cuisine tags (comma-separated)
            </label>
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              value={cuisineTagsStr}
              onChange={(e) => {
                const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                setRestEdits((p) => ({ ...p, cuisine_tags: tags }));
                setRestSaved(false);
              }}
            />
          </div>

          {/* Geo coordinates */}
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Map coordinates (GCJ-02)
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="Latitude e.g. 30.246"
                  value={(restEdits.geo_lat as string) ?? ""}
                  onChange={(e) => { setRestEdits((p) => ({ ...p, geo_lat: e.target.value })); setRestSaved(false); }}
                />
              </div>
              <div className="flex-1">
                <input
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="Longitude e.g. 120.17"
                  value={(restEdits.geo_lng as string) ?? ""}
                  onChange={(e) => { setRestEdits((p) => ({ ...p, geo_lng: e.target.value })); setRestSaved(false); }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Find coordinates on AMap → right-click location → copy coords
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveRestaurant}
              disabled={restSaving}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {restSaving ? "Saving…" : "Save restaurant"}
            </button>
            {restSaved && <span className="text-xs text-green-600">Saved ✓</span>}
          </div>
        </section>

        {/* City & Category */}
        <section className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">City &amp; Category</div>

          {/* City */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              City
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                value={cityEdit}
                onChange={(e) => { setCityEdit(e.target.value); setCityCatSaved(false); }}
              >
                <option value="">— None —</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={() => { setShowNewCity((v) => !v); setNewCityName(""); }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
              >
                + New
              </button>
            </div>

            {/* Inline new city input */}
            {showNewCity && (
              <div className="mt-2 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="City name (e.g. Beijing, Chengdu)"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCityName.trim()) {
                      const name = newCityName.trim();
                      if (!cities.includes(name)) {
                        setCities((prev) => [...prev, name].sort());
                      }
                      setCityEdit(name);
                      setNewCityName("");
                      setShowNewCity(false);
                      setCityCatSaved(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  disabled={!newCityName.trim()}
                  onClick={() => {
                    const name = newCityName.trim();
                    if (!name) return;
                    if (!cities.includes(name)) {
                      setCities((prev) => [...prev, name].sort());
                    }
                    setCityEdit(name);
                    setNewCityName("");
                    setShowNewCity(false);
                    setCityCatSaved(false);
                  }}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Category
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                value={categoryId ?? ""}
                onChange={(e) => { setCategoryId(e.target.value || null); setCityCatSaved(false); }}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => { setShowNewCat((v) => !v); setNewCatName(""); }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
              >
                + New
              </button>
            </div>

            {/* Inline new category input */}
            {showNewCat && (
              <div className="mt-2 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  placeholder="Category name (e.g. West Lake Heritage)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); }}
                  autoFocus
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={creatingCat || !newCatName.trim()}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {creatingCat ? "Creating…" : "Create"}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveCityCategory}
              disabled={cityCatSaving}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {cityCatSaving ? "Saving…" : "Save city & category"}
            </button>
            {cityCatSaved && <span className="text-xs text-green-600">Saved ✓</span>}
          </div>
        </section>

        {/* Dishes by section */}
        {sections.map((section) => {
          const sectionDishes = (section.dish_ids ?? [])
            .map((id) => dishMap.get(id))
            .filter((d): d is Dish => !!d);
          const isOver = dropIndicator?.sectionId === section.id;
          if (sectionDishes.length === 0 && !isOver) return null;

          return (
            <section
              key={section.id}
              onDragOver={(e) => {
                e.preventDefault();
                // Only fire if not already handled by a child DishCard
                if (!(e.target as HTMLElement).closest("[data-dish-card]")) {
                  setDropIndicator({ sectionId: section.id, index: sectionDishes.length });
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDropIndicator(null);
                }
              }}
              onDrop={(e) => { e.preventDefault(); handleDrop(section.id); }}
            >
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="font-semibold">{section.title_en}</h2>
                <span className="text-sm text-zinc-400">{section.title_native}</span>
                <span className="text-xs text-zinc-300">· {sectionDishes.length} dishes</span>
              </div>

              <div className="space-y-0">
                {/* Drop indicator before first dish */}
                <DropLine show={isOver && dropIndicator?.index === 0} />

                {sectionDishes.length === 0 ? (
                  <div className="min-h-12 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center">
                    <span className="text-xs text-zinc-400">Drop here</span>
                  </div>
                ) : (
                  sectionDishes.map((dish, index) => (
                    <div key={dish.id} data-dish-card>
                      <DishCard
                        dish={dish}
                        sectionId={section.id}
                        dishIndex={index}
                        onSave={handleSaveDish}
                        onDelete={handleDeleteDish}
                        onDragStart={handleDishDragStart}
                        onDragOverDish={(sid, idx) => setDropIndicator({ sectionId: sid, index: idx })}
                      />
                      <DropLine show={isOver && dropIndicator?.index === index + 1} />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
