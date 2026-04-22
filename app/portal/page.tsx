"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PortalRestaurant = {
  id: string;
  name_native: string;
  name_en: string | null;
  city: string;
  cuisine_tags: string[];
  menu_id: string | null;
  total_dishes: number;
  approved_dishes: number;
  is_published: boolean;
  created_at: string;
};

export default function PortalPage() {
  const [restaurants, setRestaurants] = useState<PortalRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/restaurants")
      .then((r) => r.json())
      .then(setRestaurants)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-400">Brivia Eats</div>
            <h1 className="text-lg font-semibold">Portal</h1>
          </div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-semibold">Restaurants</h2>
          <span className="text-sm text-zinc-400">{restaurants.length} total</span>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-400">Loading…</div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center text-sm text-zinc-400">
            No restaurants imported yet.
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => {
              const allApproved = r.total_dishes > 0 && r.approved_dishes === r.total_dishes;
              return (
                <Link
                  key={r.id}
                  href={`/portal/${r.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-400 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {r.name_en ?? r.name_native}
                      </span>
                      <span className="text-sm text-zinc-400">{r.name_native}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {r.city} · {r.approved_dishes}/{r.total_dishes} dishes approved
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.is_published ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Published
                      </span>
                    ) : allApproved ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Ready to publish
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Draft
                      </span>
                    )}
                    <span className="text-zinc-300">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
