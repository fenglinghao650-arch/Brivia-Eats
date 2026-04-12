"use client";

import Link from "next/link";
import type { Restaurant } from "@/src/mock";

type RestaurantPreviewProps = {
  restaurant: Restaurant;
  onClose: () => void;
};

export default function RestaurantPreview({
  restaurant,
  onClose,
}: RestaurantPreviewProps) {
  return (
    <div className="absolute right-4 bottom-4 left-4 z-10 animate-slide-up rounded-xl border border-zinc-100 bg-white p-4 shadow-lg sm:right-6 sm:bottom-6 sm:left-6">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-3 text-zinc-400 hover:text-zinc-600"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Restaurant info */}
      <div className="pr-6">
        <h3 className="text-base font-semibold text-zinc-900">
          {restaurant.name_en}
        </h3>
        <p className="mt-0.5 text-sm text-zinc-500">{restaurant.name_zh}</p>
        <p className="mt-1 text-xs text-zinc-400">
          {restaurant.cuisine_display}
        </p>
        <p className="mt-1 text-sm text-zinc-600">{restaurant.tagline}</p>
      </div>

      {/* Action */}
      <Link
        href={`/r/${restaurant.id}`}
        className="mt-3 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
      >
        View Menu →
      </Link>
    </div>
  );
}
