"use client";

/* eslint-disable @next/next/no-img-element */
import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { hangzhouRestaurants, type Restaurant } from "@/src/mock";
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

export default function Home() {
  const [view, setView] = useState<ExploreView>("map");
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

  const currentCity = getCityById(cityId)!;

  // Derive sorted unique cuisine tags from current city's restaurants
  const cityRestaurants = cityId === "hangzhou" ? hangzhouRestaurants : [];
  const categoryOptions = useMemo(() => {
    const tagSet = new Set<string>();
    cityRestaurants.forEach((r) =>
      (r.cuisine_tags ?? []).forEach((t) => tagSet.add(t))
    );
    return Array.from(tagSet).sort();
  }, [cityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection + filter when city changes
  const handleCityChange = (newCityId: string) => {
    setCityId(newCityId);
    setSelectedRestaurant(null);
    setSelectedCategory(null);
    setCategorySheetOpen(false);
  };

  // Build map markers from mock data
  const markers: MapMarker[] = useMemo(
    () =>
      hangzhouRestaurants
        .filter((r) => r.geo_lat && r.geo_lng)
        .map((r) => ({
          id: r.id,
          lat: r.geo_lat!,
          lng: r.geo_lng!,
          label: r.name_en,
        })),
    []
  );

  const handleMarkerClick = (markerId: string) => {
    const r = hangzhouRestaurants.find((r) => r.id === markerId);
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

        {/* Login icon */}
        <button>
          <img
            src="/icons/icon-login.svg"
            alt="Login"
            className="h-3 w-3 sm:h-3.5 sm:w-3.5"
          />
        </button>
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
          />
        )}
        {view === "liked" && <LikedView />}
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
          label="Favorites"
          active={view === "liked"}
          onClick={() => setView("liked")}
        />
      </div>
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

/* ── View placeholders ── */

function LikedView() {
  return (
    <div className="flex h-full items-center justify-center pt-8 text-sm text-zinc-400">
      {/* Liked / favorited restaurants will go here */}
    </div>
  );
}
