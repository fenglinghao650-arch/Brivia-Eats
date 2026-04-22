"use client";

/* eslint-disable @next/next/no-img-element */
import dynamic from "next/dynamic";
import { useState, useMemo, useEffect } from "react";
import { hangzhouRestaurants, type Restaurant } from "@/src/mock";
import { getLikedIds, toggleLike } from "@/src/lib/likes";
import InfoBoard from "@/src/components/InfoBoard";
import RestaurantPreview from "@/src/components/RestaurantPreview";
import RestaurantList from "@/src/components/RestaurantList";
import CitySelector from "@/src/components/CitySelector";
import CategorySheet from "@/src/components/CategorySheet";
import { DEFAULT_CITY_ID, getCityById } from "@/src/data/cities";
import type { MapMarker } from "@/src/components/AMap";

// Map needs browser APIs — never render on server
const AMap = dynamic(() => import("@/src/components/AMap"), { ssr: false });

type ExploreView = "map" | "list" | "liked";

function adaptApiRestaurant(r: Record<string, unknown>): Restaurant {
  return {
    id: r.id as string,
    name_zh: r.name_native as string,
    name_en: (r.name_en as string) ?? (r.name_native as string),
    location_display: (r.address_en as string) ?? (r.address_native as string),
    cuisine_display: ((r.cuisine_tags as string[]) ?? []).join(" · "),
    cuisine_tags: (r.cuisine_tags as string[]) ?? [],
    category_name: (r.category_name as string) ?? null,
    tagline: (r.tagline_en as string) ?? "",
    description: (r.about_short_en as string) ?? "",
    geo_lat: (r.geo_lat as number) ?? undefined,
    geo_lng: (r.geo_lng as number) ?? undefined,
    cover_photo_url: (r.cover_photo_url as string) ?? undefined,
  };
}

export default function Home() {
  const [view, setView] = useState<ExploreView>("map");
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [apiRestaurants, setApiRestaurants] = useState<Restaurant[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>(() => getLikedIds());

  const handleToggleLike = (id: string) => setLikedIds(toggleLike(id));

  const currentCity = getCityById(cityId)!;

  useEffect(() => {
    fetch(`/api/restaurants?city=${encodeURIComponent(currentCity.name_en)}`)
      .then((res) => res.json())
      .then((rows: Record<string, unknown>[]) =>
        setApiRestaurants(rows.map(adaptApiRestaurant))
      )
      .catch(() => {});
  }, [cityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // For Hangzhou, merge real restaurants with mock stubs (real first, no duplicates)
  // For all other cities, use API results only
  const mergedRestaurants = useMemo(
    () =>
      cityId === "hangzhou"
        ? [
            ...apiRestaurants,
            ...hangzhouRestaurants.filter((r) => !apiRestaurants.find((a) => a.id === r.id)),
          ]
        : apiRestaurants,
    [cityId, apiRestaurants]
  );

  const cityRestaurants = mergedRestaurants;

  // Derive sorted unique portal-assigned categories from current city's restaurants
  const categoryOptions = useMemo(() => {
    const catSet = new Set<string>();
    cityRestaurants.forEach((r) => {
      if (r.category_name) catSet.add(r.category_name);
    });
    return Array.from(catSet).sort();
  }, [cityRestaurants]);

  // Clear selection + filter when city changes
  const handleCityChange = (newCityId: string) => {
    setCityId(newCityId);
    setSelectedRestaurant(null);
    setSelectedCategory(null);
    setCategorySheetOpen(false);
  };

  // Build map markers — only restaurants with coordinates
  const markers: MapMarker[] = useMemo(
    () =>
      mergedRestaurants
        .filter((r) => r.geo_lat && r.geo_lng)
        .map((r) => ({
          id: r.id,
          lat: r.geo_lat!,
          lng: r.geo_lng!,
          label: r.name_en,
        })),
    [mergedRestaurants]
  );

  const handleMarkerClick = (markerId: string) => {
    const r = mergedRestaurants.find((r) => r.id === markerId);
    if (r) setSelectedRestaurant(r);
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-white">
      {/* ── Header bar ── */}
      <div className="relative flex shrink-0 items-center justify-between px-4 pt-16 pb-3 sm:px-6 sm:pt-[74px] sm:pb-[14px]">
        {/* City selector */}
        <CitySelector selectedCityId={cityId} onSelect={handleCityChange} />

        {/* Brand name / logo — absolutely centered */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-px">
          <img
            src="/icons/logo-b.svg"
            alt=""
            className="h-4 w-[11px] sm:h-[18px] sm:w-[13px]"
          />
          <span
            className="text-[15px] font-bold text-black sm:text-base"
            style={{ fontFamily: "var(--font-playfair-display-sc)" }}
          >
            rivia Eats
          </span>
        </div>

        {/* Spacer to balance the city selector on the left */}
        <div className="w-8" />
      </div>

      {/* ── Info Board (text-only: city intro OR restaurant detail) ── */}
      <InfoBoard
        city={currentCity}
        selectedRestaurant={selectedRestaurant}
      />

      {/* ── Explore area (controlled by bottom nav) ── */}
      <div className="relative mx-4 mt-2 min-h-0 flex-1 overflow-clip rounded-[10px] border border-black/10 sm:mx-6">
        {/* Filter bar — shared across all views */}
        <div className="absolute top-0 right-0 left-0 z-10 flex h-8 items-center px-4 sm:h-[31px]">
          <button
            onClick={() => setCategorySheetOpen(true)}
            className={`flex h-5 items-center gap-0.5 rounded-[10px] border px-4 sm:h-[20px] transition-colors ${
              selectedCategory
                ? "border-zinc-900 bg-zinc-900"
                : "border-black/10 bg-white"
            }`}
          >
            <span
              className={`text-[10px] font-bold sm:text-xs ${
                selectedCategory ? "text-white" : "text-black"
              }`}
              style={{ fontFamily: "var(--font-kalnia)" }}
            >
              {selectedCategory ?? "Category"}
            </span>
            <img
              src="/icons/icon-chevron-down.svg"
              alt=""
              className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${selectedCategory ? "invert" : ""}`}
            />
          </button>
        </div>

        {/* Category bottom sheet */}
        {categorySheetOpen && (
          <CategorySheet
            categories={categoryOptions}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            onClose={() => setCategorySheetOpen(false)}
          />
        )}

        {/* View content */}
        {view === "map" && (
          <div className="h-full">
            <AMap
              center={currentCity.center}
              zoom={14}
              markers={markers}
              onMarkerClick={handleMarkerClick}
              onMapClick={() => setSelectedRestaurant(null)}
            />
            {selectedRestaurant && (
              <RestaurantPreview
                restaurant={selectedRestaurant}
                onClose={() => setSelectedRestaurant(null)}
              />
            )}
          </div>
        )}
        {view === "list" && (
          <RestaurantList
            cityId={cityId}
            cityName={currentCity.name_en}
            restaurants={cityRestaurants}
            selectedId={selectedRestaurant?.id}
            selectedCategory={selectedCategory}
            onSelect={setSelectedRestaurant}
            likedIds={likedIds}
            onToggleLike={handleToggleLike}
          />
        )}
        {view === "liked" && (
          <LikedView
            restaurants={cityRestaurants.filter((r) => likedIds.includes(r.id))}
            likedIds={likedIds}
            onToggleLike={handleToggleLike}
            onSelect={setSelectedRestaurant}
            selectedId={selectedRestaurant?.id}
          />
        )}
      </div>

      {/* ── Bottom nav bar ── */}
      <div className="flex h-14 shrink-0 items-center justify-around px-16 py-1.5 sm:h-[65px] sm:px-24 sm:py-[7px]">
        <NavButton
          icon="/icons/icon-map.svg"
          label="Map"
          active={view === "map"}
          onClick={() => setView("map")}
        />
        <NavButton
          icon="/icons/icon-list.svg"
          label="List"
          active={view === "list"}
          onClick={() => setView("list")}
        />
        <NavButton
          icon="/icons/icon-heart.svg"
          label="Saved"
          active={view === "liked"}
          onClick={() => setView("liked")}
        />
      </div>
    </div>
  );
}

/* ── Saved / liked restaurants view ── */

function LikedView({
  restaurants,
  likedIds,
  onToggleLike,
  onSelect,
  selectedId,
}: {
  restaurants: Restaurant[];
  likedIds: string[];
  onToggleLike: (id: string) => void;
  onSelect: (r: Restaurant) => void;
  selectedId?: string;
}) {
  if (restaurants.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 py-16 text-center">
        <p className="text-sm font-semibold text-zinc-900">No saved restaurants yet</p>
        <p className="text-xs text-zinc-400">
          Tap the heart on any restaurant card to save it here.
        </p>
      </div>
    );
  }

  const PALETTE = ["bg-stone-800", "bg-zinc-700", "bg-neutral-800", "bg-stone-700"];

  return (
    <div className="h-full overflow-y-auto px-4 pt-10 pb-8 sm:px-5">
      <div className="mb-4">
        <span className="text-sm font-normal text-zinc-400 sm:text-base">{"// "}</span>
        <span className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">Saved</span>
      </div>
      <hr className="mb-4 border-zinc-100" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {restaurants.map((r, i) => (
          <LikedCard
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
    </div>
  );
}

function LikedCard({
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
      <button onClick={onSelect} className="block w-full text-left">
        <div
          className={`relative aspect-square overflow-hidden rounded-lg transition-opacity duration-200 ${
            isSelected ? "opacity-100" : "opacity-75"
          } ${restaurant.cover_photo_url ? "" : colorClass}`}
        >
          {restaurant.cover_photo_url ? (
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
        <div className="mt-2 min-h-[5.5rem] pr-7">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-zinc-900">{restaurant.name_en}</h3>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{restaurant.name_zh}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-400 sm:text-xs">{restaurant.cuisine_display}</p>
        </div>
      </button>
      <a
        href={`/r/${restaurant.id}`}
        className="mt-1.5 inline-flex rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-semibold text-white sm:text-xs"
      >
        View Menu →
      </a>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur transition-colors hover:bg-white"
        aria-label={isLiked ? "Remove from saved" : "Save restaurant"}
      >
        {isLiked ? (
          <svg className="h-3.5 w-3.5 text-zinc-900" viewBox="0 0 24 24" fill="currentColor">
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

/* ── Nav button with active state ── */

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5">
      <img
        src={icon}
        alt={label}
        className={`h-6 w-6 sm:h-[30px] sm:w-[30px] transition-opacity ${
          active ? "opacity-100" : "opacity-40"
        }`}
      />
      <span
        className={`text-[8px] font-medium transition-opacity sm:text-[9px] ${
          active ? "text-black" : "text-black/40"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

