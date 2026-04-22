"use client";

import Link from "next/link";
import { useMemo, useRef, useEffect } from "react";
import type { Restaurant } from "@/src/mock";

/* ── Placeholder colors for restaurant thumbnails ── */
const PALETTE = [
  "bg-stone-800",
  "bg-zinc-700",
  "bg-neutral-800",
  "bg-stone-700",
];

type RestaurantListProps = {
  cityId: string;
  cityName: string;
  restaurants: Restaurant[];
  selectedId?: string;
  selectedCategory?: string | null;
  onSelect: (restaurant: Restaurant) => void;
  likedIds: string[];
  onToggleLike: (id: string) => void;
};

export default function RestaurantList({
  cityName,
  restaurants,
  selectedId,
  selectedCategory,
  onSelect,
  likedIds,
  onToggleLike,
}: RestaurantListProps) {
  // Derive unique portal-assigned categories from current restaurants, sorted
  const categoryTags = useMemo(() => {
    const catSet = new Set<string>();
    restaurants.forEach((r) => {
      if (r.category_name) catSet.add(r.category_name);
    });
    return Array.from(catSet).sort();
  }, [restaurants]);

  // Sections: "All" first, then one per portal category
  const sections = useMemo(
    () => [
      { label: "All", items: restaurants },
      ...categoryTags.map((cat) => ({
        label: cat,
        items: restaurants.filter((r) => r.category_name === cat),
      })),
    ],
    [restaurants, categoryTags]
  );

  // Refs to each section div for scroll-to behavior
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // When a category is chosen in the sheet, scroll to its section
  useEffect(() => {
    const key = selectedCategory ?? "All";
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCategory]);

  if (restaurants.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-semibold text-zinc-900">
          Coming soon to {cityName}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          We&apos;re curating restaurants in this city.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-10 pb-8 sm:px-5">
      <div className="space-y-10">
        {sections.map(({ label, items }) => (
          <div
            key={label}
            ref={(el) => {
              sectionRefs.current[label] = el;
            }}
            className="scroll-mt-10"
          >
            {/* Section header — same style as original city header */}
            <div className="mb-4">
              <span className="text-sm font-normal text-zinc-400 sm:text-base">
                {"// "}
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-[#1e1e1e] sm:text-2xl">
                {label}
              </span>
            </div>

            <hr className="mb-4 border-[#d9d9d9]" />

            {items.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {items.map((r, i) => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    colorClass={PALETTE[i % PALETTE.length]}
                    isSelected={r.id === selectedId}
                    isLiked={likedIds.includes(r.id)}
                    onSelect={() => onSelect(r)}
                    onToggleLike={() => onToggleLike(r.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                No restaurants in this category yet.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Individual restaurant card ── */

function RestaurantCard({
  restaurant,
  colorClass,
  isSelected,
  isLiked,
  onSelect,
  onToggleLike,
}: {
  restaurant: Restaurant;
  colorClass: string;
  isSelected: boolean;
  isLiked: boolean;
  onSelect: () => void;
  onToggleLike: () => void;
}) {
  return (
    <div className="relative rounded-lg">
      {/* Card click → select restaurant (populates info board) */}
      <button onClick={onSelect} className="block w-full text-left">
        {/* Cover image or color placeholder */}
        <div
          className={`relative aspect-square overflow-hidden rounded-lg transition-opacity duration-200 ${
            isSelected ? "opacity-100" : "opacity-75"
          } ${restaurant.cover_photo_url ? "" : colorClass}`}
        >
          {restaurant.cover_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.cover_photo_url}
              alt={restaurant.name_en}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-2xl font-bold text-white/60 sm:text-3xl">
                {restaurant.name_zh.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Info — min-h-[5.5rem] keeps buttons aligned across columns */}
        <div className="mt-2 min-h-[5.5rem] pr-7">
          <h3 className="font-display line-clamp-2 text-sm font-bold leading-tight text-[#1e1e1e]">
            {restaurant.name_en}
          </h3>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {restaurant.name_zh}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-400 sm:text-xs">
            {restaurant.cuisine_display}
          </p>
        </div>
      </button>

      {/* View Menu → */}
      <Link
        href={`/r/${restaurant.id}`}
        className="mt-1.5 inline-flex rounded-full bg-[#d98f11] px-3 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-[#c07e0f] sm:text-xs"
      >
        View Menu →
      </Link>

      {/* Heart / save button — persisted to localStorage */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur transition-colors hover:bg-white"
        aria-label={isLiked ? "Remove from saved" : "Save restaurant"}
      >
        {isLiked ? (
          <svg className="h-3.5 w-3.5 text-[#d98f11]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </button>
    </div>
  );
}
