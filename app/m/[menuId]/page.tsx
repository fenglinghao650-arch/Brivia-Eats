"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { addToCart, getCart } from "@/src/lib/cart";
import {
  ALLERGEN_LABELS,
  DIETARY_LABELS,
  SPICE_LABELS,
  type AllergenTag,
  type DietaryTag,
  type VariationGroup,
  type IngredientRef,
  type SpiceLevel,
} from "@/src/mock";

// Types matching the /api/menus/[id] response
type MenuSection = {
  id: string;
  title_native: string;
  title_en: string;
  sort_order: number;
  dish_ids: string[];
};

type Dish = {
  id: string;
  section_id: string | null;
  native_name: string;
  romanized_name: string;
  clarity_name_en: string;
  one_line_story_en: string;
  price: number | null;
  currency: string;
  spice_level: SpiceLevel;
  allergens: AllergenTag[];
  allergen_confidence: string;
  dietary_flags: DietaryTag[];
  cooking_methods: string[];
  ingredients: IngredientRef[];
  variations: VariationGroup[];
  sort_order: number;
};

type MenuData = {
  restaurant: {
    id: string;
    name_native: string;
    name_en: string;
    main_menu_id: string | null;
  };
  menu: {
    id: string;
    title_native: string | null;
    title_en: string;
    currency: string;
  };
  sections: MenuSection[];
  dishes: Dish[];
};

export default function MenuPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const [data, setData] = useState<MenuData | null>(null);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(() => {
    const items = getCart();
    return items.reduce((total, item) => total + item.quantity, 0);
  });
  const [selectedVariations, setSelectedVariations] = useState<
    Record<string, Record<string, string[]>>
  >({});

  useEffect(() => {
    fetch(`/api/menus/${menuId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, [menuId]);

  const getSelectedOptions = (dishId: string, group: VariationGroup) => {
    const dishSelections = selectedVariations[dishId];
    if (!dishSelections || !dishSelections[group.id]) {
      const defaults = group.options.filter((opt) => opt.is_default);
      return defaults.length > 0 ? defaults.map((d) => d.id) : [];
    }
    return dishSelections[group.id];
  };

  const toggleVariation = (
    dishId: string,
    group: VariationGroup,
    optionId: string
  ) => {
    setSelectedVariations((prev) => {
      const dishSelections = prev[dishId] ?? {};
      const current = dishSelections[group.id] ?? [];
      const nextSelection =
        group.selection_mode === "single"
          ? [optionId]
          : current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      return { ...prev, [dishId]: { ...dishSelections, [group.id]: nextSelection } };
    });
  };

  const handleAddToCart = (dish: Dish) => {
    if (!data) return;
    const price = dish.price ?? 0;
    const currencySymbol = dish.currency === "CNY" ? "¥" : dish.currency;

    const variations = (dish.variations ?? []).flatMap((group) => {
      const selected = getSelectedOptions(dish.id, group);
      return selected
        .map((optionId) => {
          const option = group.options.find((o) => o.id === optionId);
          if (!option) return null;
          return {
            groupLabel: group.label_en,
            optionId: option.id,
            nameNative: option.name_native,
            nameEn: option.name_en,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
    });

    const next = addToCart({
      dishId: dish.id,
      restaurantId: data.restaurant.id,
      restaurantName: data.restaurant.name_en ?? data.restaurant.name_native,
      menuId: data.menu.id,
      romanizedName: dish.romanized_name,
      clarityName: dish.clarity_name_en,
      nativeName: dish.native_name,
      price,
      currency: currencySymbol,
      allergens: dish.allergens.map((a) => ALLERGEN_LABELS[a]),
      dietaryFlags: dish.dietary_flags.map((d) => DIETARY_LABELS[d]),
      variations,
    });
    setCartCount(next.reduce((total, item) => total + item.quantity, 0));
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-zinc-500">Menu not found.</p>
        <button
          onClick={() => window.history.back()}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  const { restaurant, menu, sections, dishes } = data;
  const currencySymbol = menu.currency === "CNY" ? "¥" : menu.currency;

  // Sort sections by sort_order
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link className="p-1 text-sm text-zinc-600" href={`/r/${restaurant.id}`}>
            ← Back
          </Link>
          <div className="text-sm font-semibold">{restaurant.name_en}</div>
          <Link
            className="p-1 text-sm text-zinc-600"
            href={`/r/${restaurant.id}/cart`}
          >
            Cart {cartCount > 0 ? `(${cartCount})` : ""}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            Menu
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Ordering confidence first
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Tap a dish to expand details. Add to cart stays visible.
          </p>
        </div>

        <div className="space-y-6">
          {sortedSections.map((section) => {
            const sectionDishes = dishes.filter(
              (d) => d.section_id === section.id
            );
            if (sectionDishes.length === 0) return null;

            return (
              <section key={section.id} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold">{section.title_en}</h2>
                  <span className="text-sm text-zinc-400">
                    {section.title_native}
                  </span>
                </div>
                {sectionDishes.map((dish) => {
                  const isExpanded = expandedId === dish.id;
                  const priceDisplay = dish.price
                    ? `${currencySymbol}${dish.price}`
                    : "市价";

                  return (
                    <article
                      key={dish.id}
                      className="rounded-2xl border border-zinc-100 bg-white shadow-sm"
                    >
                      <button
                        className="flex w-full items-start gap-3 px-4 py-3 text-left sm:gap-4 sm:px-5 sm:py-4"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : dish.id)
                        }
                      >
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                              <span className="text-base font-semibold sm:text-lg">
                                {dish.clarity_name_en}
                              </span>
                              <span className="text-sm text-zinc-500 sm:text-base">
                                {dish.native_name}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-400 sm:text-sm">
                              {dish.romanized_name}
                            </div>
                            {dish.one_line_story_en && (
                              <div className="mt-1 hidden text-xs text-zinc-400 line-clamp-2 sm:block">
                                {dish.one_line_story_en}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
                            <div className="text-sm font-semibold">
                              {priceDisplay}
                            </div>
                            <button
                              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white sm:px-3 sm:py-1"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAddToCart(dish);
                              }}
                            >
                              Add to cart
                            </button>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-3 border-t border-zinc-100 px-4 py-3 sm:space-y-4 sm:px-5 sm:py-4">
                          {/* 1. Key Ingredients */}
                          {dish.ingredients && dish.ingredients.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold uppercase text-zinc-400">
                                Key Ingredients
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {dish.ingredients
                                  .filter((ing) => !ing.is_hidden)
                                  .map((ing, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
                                    >
                                      {ing.name_en ?? ing.name_native}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Spice Level */}
                          <div>
                            <div className="text-xs font-semibold uppercase text-zinc-400">
                              Spice Level
                            </div>
                            <div className="mt-1 text-sm text-zinc-700">
                              {SPICE_LABELS[dish.spice_level]}
                            </div>
                          </div>

                          {/* 3. Allergens */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase text-zinc-400">
                                Allergens
                              </span>
                              {dish.allergen_confidence === "unknown" && (
                                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                                  Not fully confirmed
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              {dish.allergens.length > 0 ? (
                                dish.allergens.map((allergen, idx) => (
                                  <div
                                    key={idx}
                                    className="text-sm text-amber-700"
                                  >
                                    ⚠️ {ALLERGEN_LABELS[allergen as AllergenTag]}
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-zinc-500">
                                  None listed
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 4. Dietary Flags */}
                          <div>
                            <div className="text-xs font-semibold uppercase text-zinc-400">
                              Dietary
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {dish.dietary_flags.length > 0 ? (
                                dish.dietary_flags.map((flag, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600"
                                  >
                                    {DIETARY_LABELS[flag as DietaryTag]}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-zinc-500">
                                  No specific flags
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 5. Variations */}
                          {dish.variations && dish.variations.length > 0 && (
                            <div className="space-y-3">
                              {dish.variations.map((group) => {
                                const selected = getSelectedOptions(
                                  dish.id,
                                  group
                                );
                                return (
                                  <div key={group.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold uppercase text-zinc-400">
                                        {group.label_en}
                                      </span>
                                      {group.is_required && (
                                        <span className="text-xs text-red-500">
                                          Required
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {group.options.map((option) => {
                                        const isSelected = selected.includes(
                                          option.id
                                        );
                                        return (
                                          <button
                                            key={option.id}
                                            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                                              isSelected
                                                ? "border-zinc-900 bg-zinc-900 text-white"
                                                : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleVariation(
                                                dish.id,
                                                group,
                                                option.id
                                              );
                                            }}
                                          >
                                            {option.name_en ?? option.name_native}
                                            {option.price_delta &&
                                              option.price_delta !== 0 && (
                                                <span className="ml-1 opacity-70">
                                                  {option.price_delta > 0
                                                    ? "+"
                                                    : ""}
                                                  {option.price_delta}
                                                </span>
                                              )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
