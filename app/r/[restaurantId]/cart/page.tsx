"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { clearCart, getCart, getCartItemKey, updateQuantity } from "@/src/lib/cart";
import type { CartItem } from "@/src/lib/cart";

type AlertDish = {
  lineItemId: string;
  name: string;
};

type GroupedAlert = {
  label: string;
  dishes: AlertDish[];
};

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
      if (!allergenMap.has(allergen)) allergenMap.set(allergen, new Map());
      allergenMap.get(allergen)!.set(item.lineItemId, { lineItemId: item.lineItemId, name: item.dishName });
    }
    for (const flag of item.dietaryFlags) {
      if (!dietaryMap.has(flag)) dietaryMap.set(flag, new Map());
      dietaryMap.get(flag)!.set(item.lineItemId, { lineItemId: item.lineItemId, name: item.dishName });
    }
  }

  return {
    allergens: Array.from(allergenMap.entries())
      .map(([label, dishes]) => ({ label, dishes: Array.from(dishes.values()) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    dietary: Array.from(dietaryMap.entries())
      .map(([label, dishes]) => ({ label, dishes: Array.from(dishes.values()) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export default function CartPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [items, setItems] = useState<CartItem[]>(() => getCart());
  const [confirmingClear, setConfirmingClear] = useState(false);
  const highlightTimerRef = useRef<number | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  // Group items by restaurantId
  const groups = items.reduce<Map<string, { name: string; items: CartItem[] }>>(
    (acc, item) => {
      if (!acc.has(item.restaurantId)) {
        acc.set(item.restaurantId, {
          name: item.restaurantName ?? item.restaurantId,
          items: [],
        });
      }
      acc.get(item.restaurantId)!.items.push(item);
      return acc;
    },
    new Map()
  );

  const { allergens, dietary } = groupAlerts(
    items.map((item) => ({
      lineItemId: getCartItemKey(item),
      dishName: `${item.clarityName} ${item.nativeName}`,
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
      if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(() => setHighlightedItemId(null), 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#fbf9f1] text-[#1e1e1e]">
      <header className="sticky top-0 z-10 border-b border-[#d9d9d9] bg-[#fbf9f1]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link className="p-1 text-sm text-zinc-600" href={`/r/${restaurantId}`}>
            ← Back
          </Link>
          <div className="text-sm font-semibold">Your cart</div>
          {confirmingClear ? (
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-semibold text-red-500"
                onClick={() => { clearCart(); setItems([]); setConfirmingClear(false); }}
              >
                Clear all
              </button>
              <span className="text-zinc-300">|</span>
              <button
                className="text-xs text-zinc-400"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="p-1 text-sm text-zinc-500"
              onClick={() => setConfirmingClear(true)}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9d9d9] px-6 py-10 text-center text-sm text-zinc-500">
            Cart is empty. Add dishes from the menu.
          </div>
        ) : (
          <div className="space-y-6">
            {/* One section per restaurant */}
            {Array.from(groups.entries()).map(([restId, group]) => (
              <section key={restId} className="space-y-3">
                <div className="text-sm font-semibold text-zinc-900">{group.name}</div>
                {group.items.map((item) => (
                  <div
                    key={getCartItemKey(item)}
                    id={getCartItemKey(item)}
                    className={`rounded-xl border border-[#d9d9d9] px-4 py-3 transition-colors sm:rounded-2xl sm:px-5 sm:py-4 ${
                      highlightedItemId === getCartItemKey(item)
                        ? "border-[#d98f11] bg-amber-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        {/* English first, Chinese beside, pinyin below */}
                        <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                          <span className="text-sm font-semibold sm:text-base">
                            {item.clarityName}
                          </span>
                          <span className="text-xs text-zinc-500 sm:text-sm">
                            {item.nativeName}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-400">
                          {item.romanizedName}
                        </div>
                        {item.variations.length > 0 && (
                          <div className="mt-1 text-xs text-zinc-500 sm:mt-2">
                            {item.variations
                              .map((v) => v.nameEn ?? v.nameNative)
                              .join(", ")}
                          </div>
                        )}
                        <div className="mt-2 text-sm font-semibold">
                          {item.currency} {(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      {item.imageUrl && (
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-20 sm:w-20 sm:rounded-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.clarityName}
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-sm sm:mt-4">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d9d9d9] text-zinc-600 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                        onClick={() => setItems(updateQuantity(getCartItemKey(item), item.quantity - 1))}
                      >
                        -
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d9d9d9] text-zinc-600 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                        onClick={() => setItems(updateQuantity(getCartItemKey(item), item.quantity + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            ))}

            {/* Dietary alerts — across all restaurants */}
            <section className="rounded-xl border border-[#d9d9d9] px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4">
              {!hasAlerts ? (
                <>
                  <div className="text-xs font-semibold uppercase text-zinc-400">Dietary alerts</div>
                  <div className="mt-2 text-sm text-zinc-600">No alerts triggered.</div>
                </>
              ) : (
                <div className="space-y-5">
                  {allergens.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-zinc-400">Allergens</div>
                      <div className="mt-3 space-y-3">
                        {allergens.map((alert) => (
                          <div key={alert.label}>
                            <div className="text-sm font-semibold text-zinc-800">{alert.label}</div>
                            <div className="text-xs text-zinc-500">
                              {alert.dishes.map((dish, i) => (
                                <span key={dish.lineItemId}>
                                  <button
                                    className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                                    onClick={() => handleAlertClick(dish.lineItemId)}
                                  >
                                    {dish.name}
                                  </button>
                                  {i < alert.dishes.length - 1 ? " · " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dietary.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-zinc-400">Dietary flags</div>
                      <div className="mt-3 space-y-3">
                        {dietary.map((alert) => (
                          <div key={alert.label}>
                            <div className="text-sm font-semibold text-zinc-800">{alert.label}</div>
                            <div className="text-xs text-zinc-500">
                              {alert.dishes.map((dish, i) => (
                                <span key={dish.lineItemId}>
                                  <button
                                    className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                                    onClick={() => handleAlertClick(dish.lineItemId)}
                                  >
                                    {dish.name}
                                  </button>
                                  {i < alert.dishes.length - 1 ? " · " : ""}
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
                className="rounded-full bg-[#d98f11] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c07e0f] active:scale-95 sm:px-4 sm:py-2"
                href={`/r/${restaurantId}/show`}
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
