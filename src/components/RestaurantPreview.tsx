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
  const openAmapUrl =
    restaurant.geo_lng && restaurant.geo_lat
      ? `https://uri.amap.com/marker?position=${restaurant.geo_lng},${restaurant.geo_lat}&name=${encodeURIComponent(
          restaurant.name_zh
        )}`
      : null;

  return (
    <div className="absolute right-4 bottom-4 left-4 z-10 max-h-[72%] animate-slide-up overflow-y-auto rounded-xl border border-[#d9d9d9] bg-[#fbf9f1] p-4 shadow-lg sm:right-6 sm:bottom-6 sm:left-6">
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
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              restaurant.source === "amap"
                ? "bg-zinc-100 text-zinc-600"
                : "bg-[#d98f11]/15 text-[#9b6207]"
            }`}
          >
            {restaurant.has_menu === false ? "AMap POI" : "Brivia menu"}
          </span>
          {restaurant.rating && (
            <span className="text-[10px] font-medium text-zinc-500">
              Rating {restaurant.rating}
            </span>
          )}
          {restaurant.cost && (
            <span className="text-[10px] font-medium text-zinc-500">
              Avg ¥{restaurant.cost}
            </span>
          )}
        </div>
        <h3 className="font-display text-base font-semibold text-[#1e1e1e]">
          {restaurant.name_en}
        </h3>
        <p className="mt-0.5 text-sm text-zinc-500">{restaurant.name_zh}</p>
        {restaurant.cuisine_display && (
          <p className="mt-1 text-xs text-zinc-400">{restaurant.cuisine_display}</p>
        )}
        {restaurant.tagline && (
          <p className="mt-1 text-sm text-zinc-600">{restaurant.tagline}</p>
        )}
        <div className="mt-3 space-y-1.5 text-xs text-zinc-600">
          {restaurant.location_display && (
            <p>
              <span className="font-semibold text-zinc-500">Address:</span>{" "}
              {restaurant.location_display}
            </p>
          )}
          {restaurant.opening_hours && (
            <p>
              <span className="font-semibold text-zinc-500">Hours:</span>{" "}
              {restaurant.opening_hours}
            </p>
          )}
          {restaurant.phone && (
            <p>
              <span className="font-semibold text-zinc-500">Phone:</span>{" "}
              <a className="underline decoration-zinc-300" href={`tel:${restaurant.phone}`}>
                {restaurant.phone}
              </a>
            </p>
          )}
          {restaurant.business_area && (
            <p>
              <span className="font-semibold text-zinc-500">Area:</span>{" "}
              {restaurant.business_area}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {restaurant.has_menu !== false ? (
          <Link
            href={`/r/${restaurant.id}`}
            className="inline-flex rounded-full bg-[#d98f11] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c07e0f] active:scale-95"
          >
            View Menu →
          </Link>
        ) : (
          <span className="inline-flex rounded-full border border-[#d9d9d9] px-4 py-2 text-sm font-semibold text-zinc-500">
            Menu unavailable
          </span>
        )}
        {openAmapUrl && (
          <a
            href={openAmapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-[#d9d9d9] px-4 py-2 text-sm font-semibold text-[#1e1e1e] transition-colors hover:border-zinc-400"
          >
            Open in AMap
          </a>
        )}
      </div>
    </div>
  );
}
