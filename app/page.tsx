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
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-[#fbf9f1]">
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
      <div className="relative mx-4 mt-2 min-h-0 flex-1 overflow-clip rounded-[10px] border border-[#d9d9d9] sm:mx-6">
        {/* Filter bar — shared across all views */}
        <div className="absolute top-0 right-0 left-0 z-10 flex h-8 items-center px-4 sm:h-[31px]">
          <button
            onClick={() => setCategorySheetOpen(true)}
            className={`flex h-5 items-center gap-0.5 rounded-[10px] border px-4 sm:h-[20px] transition-colors ${
              selectedCategory
                ? "border-[#1e1e1e] bg-[#1e1e1e]"
                : "border-[#d9d9d9] bg-[#fbf9f1]"
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
          icon={<MapIcon />}
          label="Map"
          active={view === "map"}
          onClick={() => setView("map")}
        />
        <NavButton
          icon={<ListIcon />}
          label="List"
          active={view === "list"}
          onClick={() => setView("list")}
        />
        <NavButton
          icon={<HeartIcon />}
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
        <p className="text-sm font-semibold text-[#1e1e1e]">No saved restaurants yet</p>
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
        <span className="font-display text-xl font-bold tracking-tight text-[#1e1e1e] sm:text-2xl">Saved</span>
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
          <h3 className="font-display line-clamp-2 text-sm font-bold leading-tight text-[#1e1e1e]">{restaurant.name_en}</h3>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{restaurant.name_zh}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-400 sm:text-xs">{restaurant.cuisine_display}</p>
        </div>
      </button>
      <a
        href={`/r/${restaurant.id}`}
        className="mt-1.5 inline-flex rounded-full bg-[#d98f11] px-3 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-[#c07e0f] sm:text-xs"
      >
        View Menu →
      </a>
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

/* ── Inline nav icons — currentColor lets Tailwind drive the tint ── */

function MapIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path d="M3.045 6.43375C2.5 7.05375 2.5 8.11875 2.5 10.2462V21.9887C2.5 23.4962 2.5 24.25 2.89375 24.8175C3.28625 25.385 3.97375 25.6237 5.34875 26.1L6.96625 26.6613C7.8425 26.965 8.51625 27.1987 9.0825 27.3487C9.4525 27.4475 9.79125 27.1575 9.79125 26.775V7.8375C9.78693 7.68569 9.73246 7.53959 9.63635 7.422C9.54025 7.30441 9.40791 7.22195 9.26 7.1875C8.77375 7.06375 8.18875 6.86125 7.3875 6.58375C5.44625 5.91 4.475 5.57375 3.7375 5.915C3.47353 6.03859 3.23781 6.21517 3.045 6.43375ZM15.775 4.35125L13.855 5.6825C13.1612 6.16375 12.6513 6.5175 12.2175 6.76875C12.1157 6.82633 12.0306 6.90937 11.9706 7.00973C11.9105 7.11009 11.8776 7.22433 11.875 7.34125V26.15C11.875 26.6125 12.355 26.9025 12.745 26.6525C13.1638 26.385 13.6438 26.0525 14.225 25.65L16.145 24.3188C16.8388 23.8375 17.3487 23.4838 17.7825 23.2325C17.8843 23.1749 17.9694 23.0919 18.0294 22.9915C18.0895 22.8912 18.1224 22.7769 18.125 22.66V3.85C18.125 3.38625 17.645 3.0975 17.255 3.34625C16.8362 3.615 16.3562 3.9475 15.775 4.35125ZM24.65 3.9L23.0338 3.34C22.1575 3.03625 21.4837 2.8025 20.9175 2.6525C20.5475 2.55375 20.2087 2.84375 20.2087 3.22625V22.1638C20.2131 22.3156 20.2675 22.4617 20.3636 22.5792C20.4598 22.6968 20.5921 22.7793 20.74 22.8137C21.2262 22.9375 21.8113 23.1387 22.6125 23.4175C24.5538 24.0912 25.525 24.4275 26.2625 24.0862C26.5265 23.9627 26.7622 23.7861 26.955 23.5675C27.5 22.9475 27.5 21.8825 27.5 19.755V8.0125C27.5 6.505 27.5 5.75 27.1062 5.18375C26.7137 4.61625 26.0263 4.3775 24.6513 3.90125" fill="currentColor"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path d="M23.75 21.25H15C13.6212 21.25 12.5 22.3712 12.5 23.75C12.5 25.1288 13.6212 26.25 15 26.25H23.75C25.1288 26.25 26.25 25.1288 26.25 23.75C26.25 22.3712 25.1288 21.25 23.75 21.25ZM23.75 12.5H15C13.6212 12.5 12.5 13.6212 12.5 15C12.5 16.3788 13.6212 17.5 15 17.5H23.75C25.1288 17.5 26.25 16.3788 26.25 15C26.25 13.6212 25.1288 12.5 23.75 12.5ZM23.75 3.75H15C13.6212 3.75 12.5 4.87125 12.5 6.25C12.5 7.62875 13.6212 8.75 15 8.75H23.75C25.1288 8.75 26.25 7.62875 26.25 6.25C26.25 4.87125 25.1288 3.75 23.75 3.75Z" fill="currentColor"/>
      <path d="M6.25 26.875C7.97589 26.875 9.375 25.4759 9.375 23.75C9.375 22.0241 7.97589 20.625 6.25 20.625C4.52411 20.625 3.125 22.0241 3.125 23.75C3.125 25.4759 4.52411 26.875 6.25 26.875Z" fill="currentColor"/>
      <path d="M6.25 18.125C7.97589 18.125 9.375 16.7259 9.375 15C9.375 13.2741 7.97589 11.875 6.25 11.875C4.52411 11.875 3.125 13.2741 3.125 15C3.125 16.7259 4.52411 18.125 6.25 18.125Z" fill="currentColor"/>
      <path d="M6.25 9.375C7.97589 9.375 9.375 7.97589 9.375 6.25C9.375 4.52411 7.97589 3.125 6.25 3.125C4.52411 3.125 3.125 4.52411 3.125 6.25C3.125 7.97589 4.52411 9.375 6.25 9.375Z" fill="currentColor"/>
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path d="M9.375 5C5.57813 5 2.5 8.07813 2.5 11.875C2.5 18.75 10.625 25 15 26.4537C19.375 25 27.5 18.75 27.5 11.875C27.5 8.07813 24.4219 5 20.625 5C18.3 5 16.2438 6.15438 15 7.92125C14.3659 7.01837 13.5237 6.2815 12.5446 5.77302C11.5655 5.26453 10.4783 4.99938 9.375 5Z" fill="currentColor"/>
    </svg>
  );
}

/* ── Nav button with active state ── */

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5">
      <div className={`h-6 w-6 sm:h-[28px] sm:w-[28px] transition-colors duration-200 ${
        active ? "text-[#d98f11]" : "text-[#1e1e1e]/25"
      }`}>
        {icon}
      </div>
      <span className={`text-[8px] font-semibold tracking-wide transition-colors duration-200 sm:text-[9px] ${
        active ? "text-[#d98f11]" : "text-[#1e1e1e]/25"
      }`}>
        {label}
      </span>
    </button>
  );
}

