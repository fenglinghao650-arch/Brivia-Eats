"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addToCart, getCart } from "@/src/lib/cart";
import {
  getDishesBySection,
  menu,
  restaurant,
  sections,
  type Dish as MockDish,
  ALLERGEN_LABELS,
  DIETARY_LABELS,
  SPICE_LABELS,
  type AllergenTag,
  type DietaryTag,
  type VariationGroup,
} from "@/src/mock";

type MenuPageProps = {
  params: { menuId: string };
};

const currencySymbol = menu.currency === "CNY" ? "¥" : menu.currency;

const getPriceValue = (priceDisplay: string) => {
  const match = priceDisplay.match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
};

export default function MenuPage(_: MenuPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [selectedVariations, setSelectedVariations] = useState<
    Record<string, Record<string, string[]>>
  >({});

  useEffect(() => {
    const items = getCart();
    const count = items.reduce((total, item) => total + item.quantity, 0);
    setCartCount(count);
  }, []);

  const getSelectedOptions = (dishId: string, group: VariationGroup) => {
    const dishSelections = selectedVariations[dishId];
    if (!dishSelections || !dishSelections[group.id]) {
      // Return defaults
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

      let nextSelection: string[];
      if (group.selection_mode === "single") {
        nextSelection = [optionId];
      } else {
        nextSelection = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      }

      return {
        ...prev,
        [dishId]: {
          ...dishSelections,
          [group.id]: nextSelection,
        },
      };
    });
  };

  const handleAddToCart = (dish: MockDish) => {
    const price = getPriceValue(dish.price_display);
    
    // Build variations from selected options
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
      restaurantId: restaurant.id,
      menuId: menu.id,
      romanizedName: dish.romanized,
      clarityName: dish.layer2_clarity,
      nativeName: dish.native_name_zh,
      price,
      currency: currencySymbol,
      allergens: dish.allergens.map((a) => ALLERGEN_LABELS[a]),
      dietaryFlags: dish.dietary_flags.map((d) => DIETARY_LABELS[d]),
      variations,
      imageUrl: dish.image_url,
    });
    const count = next.reduce((total, item) => total + item.quantity, 0);
    setCartCount(count);
  };

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
          {sections.map((section) => {
            const sectionDishes = getDishesBySection(section.id);
            if (sectionDishes.length === 0) {
              return null;
            }
            return (
              <section key={section.id} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold">{section.name_en}</h2>
                  <span className="text-sm text-zinc-400">
                    {section.name_zh}
                  </span>
                </div>
                {sectionDishes.map((dish) => {
                  const isExpanded = expandedId === dish.id;
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
                        {/* Thumbnail Image */}
                        {dish.image_url && (
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-20 sm:w-20 sm:rounded-xl">
                            <img
                              src={dish.image_url}
                              alt={dish.romanized}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                              <span className="text-base font-semibold sm:text-lg">
                                {dish.romanized}
                              </span>
                              <span className="text-sm text-zinc-500 sm:text-base">
                                {dish.native_name_zh}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-600 sm:text-sm">
                              {dish.layer2_clarity}
                            </div>
                            {dish.layer3_story && (
                              <div className="mt-1 hidden text-xs text-zinc-400 line-clamp-2 sm:block">
                                {dish.layer3_story}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
                            <div className="text-sm font-semibold">
                              {dish.price_display}
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
                          {/* Hero Image */}
                          {dish.image_url && (
                            <div className="overflow-hidden rounded-lg bg-zinc-100 sm:rounded-xl">
                              <img
                                src={dish.image_url}
                                alt={dish.romanized}
                                className="h-40 w-full object-cover sm:h-48"
                                onError={(e) => {
                                  e.currentTarget.parentElement!.style.display =
                                    "none";
                                }}
                              />
                            </div>
                          )}

                          {/* 1. Key Ingredients */}
                          <div>
                            <div className="text-xs font-semibold uppercase text-zinc-400">
                              Key Ingredients
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {dish.core_ingredients
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

                          {/* 2. Spice Level */}
                          <div>
                            <div className="text-xs font-semibold uppercase text-zinc-400">
                              Spice Level
                            </div>
                            <div className="mt-1 text-sm text-zinc-700">
                              {SPICE_LABELS[dish.spice_level]}
                            </div>
                          </div>

                          {/* 3. Allergens (visually emphasized) */}
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
