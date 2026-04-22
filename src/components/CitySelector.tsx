"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect } from "react";
import { CITIES, getCityById } from "@/src/data/cities";

type CitySelectorProps = {
  selectedCityId: string;
  onSelect: (cityId: string) => void;
};

export default function CitySelector({
  selectedCityId,
  onSelect,
}: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCity = getCityById(selectedCityId);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5"
      >
        <span
          className="text-[10px] font-bold text-black sm:text-xs"
          style={{ fontFamily: "var(--font-kalnia)" }}
        >
          {currentCity?.name_en ?? "City"}
        </span>
        <img
          src="/icons/icon-chevron-down.svg"
          alt=""
          className={`h-2.5 w-2.5 transition-transform duration-200 sm:h-3 sm:w-3 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-48 rounded-xl border border-black/10 bg-white py-1 shadow-lg">
          {CITIES.map((city) => {
            const isSelected = city.id === selectedCityId;
            return (
              <button
                key={city.id}
                onClick={() => {
                  onSelect(city.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-zinc-50 ${
                  isSelected ? "bg-zinc-50" : ""
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-zinc-900 sm:text-sm">
                    {city.name_en}
                  </div>
                  <div className="text-[10px] text-zinc-400 sm:text-xs">
                    {city.name_zh}
                  </div>
                </div>
                {isSelected && (
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-zinc-900"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
