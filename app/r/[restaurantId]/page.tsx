"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RestaurantData = {
  id: string;
  name_native: string;
  name_en: string | null;
  city: string;
  address_native: string;
  address_en?: string | null;
  cuisine_tags: string[];
  about_short_en: string;
  hours_text?: string | null;
  main_menu_id: string | null;
  cover_photo_url?: string | null;
  crop_position?: string | null;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 rounded px-1.5 py-0.5 text-xs text-zinc-400 border border-zinc-200 hover:border-zinc-400 hover:text-zinc-600 transition-colors"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function RestaurantPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/restaurants/${restaurantId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setRestaurant)
      .catch(() => setError(true));
  }, [restaurantId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fbf9f1] px-6 text-center">
        <p className="text-sm text-zinc-500">Restaurant not found.</p>
        <Link href="/" className="rounded-full bg-[#d98f11] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c07e0f]">
          Back to home
        </Link>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  const cuisineDisplay = restaurant.cuisine_tags.join(" · ");

  return (
    <div className="min-h-screen bg-[#fbf9f1] text-[#1e1e1e]">
      <header className="sticky top-0 z-10 border-b border-[#d9d9d9] bg-[#fbf9f1]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link className="p-1 text-sm text-zinc-500" href="/">← Back</Link>
          <div className="flex items-center gap-px">
            <img src="/icons/logo-b.svg" alt="" className="h-3.5 w-[10px]" />
            <span className="text-[13px] font-bold text-[#1e1e1e]" style={{ fontFamily: "var(--font-playfair-display-sc)" }}>rivia Eats</span>
          </div>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="rounded-xl border border-[#d9d9d9] overflow-hidden bg-white sm:rounded-2xl">
          {restaurant.cover_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.cover_photo_url}
              alt={restaurant.name_en ?? restaurant.name_native}
              className="h-72 w-full object-cover sm:h-80"
              style={{ objectPosition: `center ${restaurant.crop_position ?? "50"}%` }}
            />
          )}
          <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            Restaurant
          </div>

          {/* English name (heading) */}
          <h1 className="font-display mt-2 text-xl font-semibold sm:text-2xl">
            {restaurant.name_en ?? restaurant.name_native}
          </h1>

          {/* Chinese name + copy button */}
          {restaurant.name_en && (
            <div className="mt-1 flex items-center">
              <span className="text-sm text-zinc-500">{restaurant.name_native}</span>
              <CopyButton text={restaurant.name_native} />
            </div>
          )}

          {/* English address */}
          {restaurant.address_en && (
            <div className="mt-3 text-sm text-zinc-600">
              {restaurant.address_en}
            </div>
          )}

          {/* Chinese address + copy button for AMap */}
          <div className="mt-1 flex items-center">
            <span className="text-sm text-zinc-500">{restaurant.address_native}</span>
            <CopyButton text={restaurant.address_native} />
          </div>

          {restaurant.hours_text && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-zinc-600">
              <span>🕐</span>
              <span>{restaurant.hours_text}</span>
            </div>
          )}

          {cuisineDisplay && (
            <div className="mt-2 text-sm text-zinc-600">{cuisineDisplay}</div>
          )}
          {restaurant.about_short_en && (
            <p className="mt-2 text-sm text-zinc-600">{restaurant.about_short_en}</p>
          )}
          </div>
        </div>

        <section className="mt-4 space-y-4 sm:mt-6">
          <div className="rounded-xl border border-[#d9d9d9] bg-white px-4 py-4 sm:rounded-2xl sm:px-6 sm:py-5">
            <div className="text-sm font-semibold">Main Menu</div>
            <p className="mt-2 text-sm text-zinc-600">
              Browse the food and order like a local!
            </p>
            {restaurant.main_menu_id ? (
              <Link
                className="mt-4 inline-flex rounded-full bg-[#d98f11] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c07e0f] active:scale-95 sm:px-4 sm:py-2"
                href={`/m/${restaurant.main_menu_id}`}
              >
                Open menu
              </Link>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">Menu coming soon.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
