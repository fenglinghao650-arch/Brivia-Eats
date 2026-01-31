"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clearCart, getCart, getCartItemKey, updateQuantity } from "@/src/lib/cart";
import { menu, restaurant } from "@/src/mock";

type CartPageProps = {
  params: { restaurantId: string };
};

type AlertDish = {
  lineItemId: string;
  name: string;
};

type GroupedAlert = {
  label: string;
  dishes: AlertDish[];
};

/** Group alerts by kind (allergen or dietary) and aggregate dish names */
function groupAlerts(
  items: {
    lineItemId: string;
    dishName: string;
    allergens: string[];
    dietaryFlags: string[];
  }[]
): { allergens: GroupedAlert[]; dietary: GroupedAlert[] } {
  const allergenMap = new Map<string, Map<string, AlertDish>>();
  const dietaryMap = new Map<string, Map<string, AlertDish>>();

  for (const item of items) {
    for (const allergen of item.allergens) {
      if (!allergenMap.has(allergen)) {
        allergenMap.set(allergen, new Map());
      }
      allergenMap
        .get(allergen)!
        .set(item.lineItemId, { lineItemId: item.lineItemId, name: item.dishName });
    }
    for (const flag of item.dietaryFlags) {
      if (!dietaryMap.has(flag)) {
        dietaryMap.set(flag, new Map());
      }
      dietaryMap
        .get(flag)!
        .set(item.lineItemId, { lineItemId: item.lineItemId, name: item.dishName });
    }
  }

  const allergens: GroupedAlert[] = Array.from(allergenMap.entries())
    .map(([label, dishes]) => ({ label, dishes: Array.from(dishes.values()) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const dietary: GroupedAlert[] = Array.from(dietaryMap.entries())
    .map(([label, dishes]) => ({ label, dishes: Array.from(dishes.values()) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { allergens, dietary };
}

export default function CartPage(_: CartPageProps) {
  const [items, setItems] = useState(getCart());
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const { allergens, dietary } = groupAlerts(
    items.map((item) => ({
      lineItemId: getCartItemKey(item),
      dishName: `${item.romanizedName} ${item.nativeName}`,
      allergens: item.allergens,
      dietaryFlags: item.dietaryFlags,
    }))
  );

  const hasAlerts = allergens.length > 0 || dietary.length > 0;
  const handleAlertClick = (lineItemId: string) => {
    const target = document.getElementById(lineItemId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedItemId(lineItemId);
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedItemId(null);
      }, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link className="p-1 text-sm text-zinc-600" href={`/m/${menu.id}`}>
            ← Back
          </Link>
          <div className="text-sm font-semibold">Your cart</div>
          <button
            className="p-1 text-sm text-zinc-500"
            onClick={() => {
              clearCart();
              setItems([]);
            }}
          >
            Clear
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 text-sm text-zinc-600">{restaurant.name_en}</div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-10 text-center text-sm text-zinc-500">
            Cart is empty. Add dishes from the menu.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              {items.map((item) => (
                <div
                  key={getCartItemKey(item)}
                  id={getCartItemKey(item)}
                  className={`rounded-xl border border-zinc-100 px-4 py-3 transition-colors sm:rounded-2xl sm:px-5 sm:py-4 ${
                    highlightedItemId === getCartItemKey(item)
                      ? "border-zinc-900 bg-zinc-50"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                        <span className="text-sm font-semibold sm:text-base">
                          {item.romanizedName}
                        </span>
                        <span className="text-xs text-zinc-500 sm:text-sm">
                          {item.nativeName}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 line-clamp-2 sm:text-sm">
                        {item.clarityName}
                      </div>
                      {item.variations.length > 0 && (
                        <div className="mt-1 text-xs text-zinc-500 sm:mt-2">
                            {item.variations
                              .map((variation) => variation.nameEn ?? variation.nameNative)
                              .join(", ")}
                          </div>
                        )}
                        <div className="mt-2 text-sm font-semibold">
                          {item.currency} {(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      {/* Thumbnail Image */}
                      {item.imageUrl && (
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-20 sm:w-20 sm:rounded-xl">
                          <img
                            src={item.imageUrl}
                            alt={item.romanizedName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  <div className="mt-3 flex items-center gap-3 text-sm sm:mt-4">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                      onClick={() =>
                        setItems(
                          updateQuantity(getCartItemKey(item), item.quantity - 1)
                        )
                      }
                    >
                      -
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                      onClick={() =>
                        setItems(
                          updateQuantity(getCartItemKey(item), item.quantity + 1)
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {/* Dietary Alerts - Grouped by Allergens and Dietary Flags */}
            <section className="rounded-xl border border-zinc-100 px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4">
              {!hasAlerts ? (
                <>
                  <div className="text-xs font-semibold uppercase text-zinc-400">
                    Dietary alerts
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">
                    No alerts triggered.
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  {/* Allergens Section */}
                  {allergens.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-zinc-400">
                        Allergens
                      </div>
                      <div className="mt-3 space-y-3">
                        {allergens.map((alert) => (
                          <div key={alert.label}>
                            <div className="text-sm font-semibold text-zinc-800">
                              {alert.label}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {alert.dishes.map((dish, index) => (
                                <span key={dish.lineItemId}>
                                  <button
                                    className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                                    onClick={() => handleAlertClick(dish.lineItemId)}
                                  >
                                    {dish.name}
                                  </button>
                                  {index < alert.dishes.length - 1 ? " · " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dietary Flags Section */}
                  {dietary.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-zinc-400">
                        Dietary flags
                      </div>
                      <div className="mt-3 space-y-3">
                        {dietary.map((alert) => (
                          <div key={alert.label}>
                            <div className="text-sm font-semibold text-zinc-800">
                              {alert.label}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {alert.dishes.map((dish, index) => (
                                <span key={dish.lineItemId}>
                                  <button
                                    className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                                    onClick={() => handleAlertClick(dish.lineItemId)}
                                  >
                                    {dish.name}
                                  </button>
                                  {index < alert.dishes.length - 1 ? " · " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="flex items-center justify-between gap-4">
              <div className="text-base font-semibold sm:text-lg">
                Total {items[0]?.currency ?? "¥"} {total.toFixed(2)}
              </div>
              <Link
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white sm:px-4 sm:py-2"
                href={`/r/${restaurant.id}/show`}
              >
                Show to server
              </Link>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
