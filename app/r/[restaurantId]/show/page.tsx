"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { getCart, getCartItemKey } from "@/src/lib/cart";
import { track, getLastLocale } from "@/src/lib/analytics";

export default function ShowToServerPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  // Read-only page: derive items directly from cart storage (no mutations needed)
  const items = useMemo(() => getCart(restaurantId), [restaurantId]);

  const restaurantName = items[0]?.restaurantName ?? "";

  // Analytics: reaching this screen with a non-empty cart is the validation
  // signal for "diner intends to order". Fire once per mount.
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || items.length === 0) return;
    fired.current = true;
    const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const orderValue = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    track("show_to_server", {
      restaurant_id: restaurantId,
      menu_id: items[0]?.menuId ?? null,
      locale: getLastLocale(),
      cart_item_count: cartItemCount,
      estimated_order_value: Math.round(orderValue * 100) / 100,
      currency: items[0]?.currency ?? null,
    });
  }, [items, restaurantId]);

  return (
    <div className="min-h-screen bg-[#fbf9f1] text-[#1e1e1e]">
      <header className="sticky top-0 z-10 border-b border-[#d9d9d9] bg-[#fbf9f1]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link className="p-1 text-sm text-zinc-600" href={`/r/${restaurantId}/cart`}>
            ← Back
          </Link>
          <div className="text-sm font-semibold">Show to server</div>
          <span className="text-xs text-zinc-400">No payment</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {restaurantName && (
          <div className="rounded-xl border border-[#d9d9d9] px-4 py-5 sm:rounded-2xl sm:px-6 sm:py-6">
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
              Restaurant
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">
              {restaurantName}
            </div>
          </div>
        )}

        <section className="mt-4 space-y-3 sm:mt-6">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9d9d9] px-4 py-8 text-center text-sm text-zinc-500 sm:rounded-2xl sm:px-6 sm:py-10">
              Cart is empty. Add items to show.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={getCartItemKey(item)}
                className="rounded-xl border border-[#d9d9d9] px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Chinese name primary — server reads this */}
                    <div className="text-base font-semibold sm:text-lg">
                      {item.nativeName}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {item.romanizedName}
                    </div>
                    {item.variations.length > 0 && (
                      <div className="mt-1 text-xs text-zinc-500 sm:mt-2">
                        {item.variations.map((v) => v.nameNative).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="text-base font-semibold sm:text-lg">
                    ×{item.quantity}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
