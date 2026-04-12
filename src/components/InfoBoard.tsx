"use client";

import type { City } from "@/src/data/cities";
import type { Restaurant } from "@/src/mock";

type InfoBoardProps = {
  city: City;
  selectedRestaurant: Restaurant | null;
};

export default function InfoBoard({
  city,
  selectedRestaurant,
}: InfoBoardProps) {
  return (
    <div className="mx-4 h-24 shrink-0 overflow-y-auto rounded-[10px] border border-black/10 sm:mx-6 sm:h-[106px]">
      {selectedRestaurant ? (
        <RestaurantInfo restaurant={selectedRestaurant} />
      ) : (
        <CityInfo city={city} />
      )}
    </div>
  );
}

/* ── City food scene intro ── */

function CityInfo({ city }: { city: City }) {
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-baseline gap-1.5">
        <h2 className="text-sm font-bold text-zinc-900 sm:text-base">
          {city.name_en}
        </h2>
        <span className="text-xs text-zinc-400">{city.name_zh}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">
        {city.food_intro}
      </p>
    </div>
  );
}

/* ── Restaurant text info ── */

function RestaurantInfo({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-baseline gap-1.5">
        <h2 className="text-sm font-bold text-zinc-900 sm:text-base">
          {restaurant.name_en}
        </h2>
        <span className="text-xs text-zinc-400">{restaurant.name_zh}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-zinc-400 sm:text-xs">
        {restaurant.cuisine_display}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">
        {restaurant.description}
      </p>
    </div>
  );
}
