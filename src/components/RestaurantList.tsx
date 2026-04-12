"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
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
};

export default function RestaurantList({
  cityName,
  restaurants,
  selectedId,
  selectedCategory,
  onSelect,
}: RestaurantListProps) {
  // Derive unique tags from current restaurants, sorted
  const categoryTags = useMemo(() => {
    const tagSet = new Set<string>();
    restaurants.forEach((r) =>
      (r.cuisine_tags ?? []).forEach((t) => tagSet.add(t))
    );
    return Array.from(tagSet).sort();
  }, [restaurants]);

  // Sections: "All" first, then one per tag
  const sections = useMemo(
    () => [
      { label: "All", items: restaurants },
      ...categoryTags.map((tag) => ({
        label: tag,
        items: restaurants.filter((r) => r.cuisine_tags?.includes(tag)),
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
              <span className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
                {label}
              </span>
            </div>

            <hr className="mb-4 border-zinc-100" />

            {items.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {items.map((r, i) => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    colorClass={PALETTE[i % PALETTE.length]}
                    isSelected={r.id === selectedId}
                    onSelect={() => onSelect(r)}
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
  onSelect,
}: {
  restaurant: Restaurant;
  colorClass: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="group relative rounded-lg">
      {/* Card click → select restaurant (populates info board) */}
      <button onClick={onSelect} className="block w-full text-left">
        {/* Image placeholder */}
        <div
          className={`${colorClass} flex aspect-square items-center justify-center rounded-lg transition-opacity duration-200 ${
            isSelected ? "opacity-100" : "opacity-75"
          }`}
        >
          <span className="text-2xl font-bold text-white/60 sm:text-3xl">
            {restaurant.name_zh.charAt(0)}
          </span>
        </div>

        {/* Info — min-h-20 accommodates 2-line names so buttons align */}
        <div className="mt-2 min-h-[5.5rem] pr-7">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-zinc-900">
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
        className="mt-1.5 inline-flex rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-semibold text-white sm:text-xs"
      >
        View Menu →
      </Link>

      {/* Heart / like button */}
      <button
        onClick={() => setLiked(!liked)}
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur transition-colors hover:bg-white"
        aria-label={liked ? "Unlike" : "Like"}
      >
        {liked ? (
          <svg
            className="h-3.5 w-3.5 text-zinc-900"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg
            className="h-3.5 w-3.5 text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </button>
    </div>
  );
}
