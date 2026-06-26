"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LOCALE_NAMES, type Locale } from "@/src/lib/menu-i18n";

type RestaurantMetrics = {
  id: string;
  name_native: string;
  name_en: string | null;
  scans: number;
  views: number;
  visitors: number;
  show_events: number;
  show_visitors: number;
  views_7d: number;
  visitors_7d: number;
  show_visitors_7d: number;
  languages: { locale: string; n: number }[];
  conversion: number | null;
  conversion_7d: number | null;
};

type AnalyticsData = {
  restaurants: RestaurantMetrics[];
  totals: { scans: number; views: number; show_events: number };
};

const pct = (v: number | null) =>
  v === null ? "—" : `${Math.round(v * 100)}%`;

const localeLabel = (code: string) =>
  LOCALE_NAMES[code as Locale] ?? code;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.restaurants)) {
          setData(d);
        } else {
          setLoadError(d?.error ?? "Failed to load analytics");
        }
      })
      .catch(() => setLoadError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const rows = data?.restaurants ?? [];
  const hasAnyData = rows.some((r) => r.scans + r.views + r.show_events > 0);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-400">
              Brivia Eats
            </div>
            <h1 className="text-lg font-semibold">Analytics</h1>
          </div>
          <Link
            href="/portal"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back to portal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <p className="mb-6 text-sm text-zinc-500">
          Anonymous usage per restaurant. Conversion is per person — the share of
          menu visitors who reached “Show to server”.
        </p>

        {loadError && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Couldn’t load analytics ({loadError}). Refresh in a moment.
          </div>
        )}

        {data && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <SummaryCard label="QR scans" value={data.totals.scans} />
            <SummaryCard label="Menu views" value={data.totals.views} />
            <SummaryCard
              label="Show-to-server"
              value={data.totals.show_events}
            />
          </div>
        )}

        {loading ? (
          <div className="text-sm text-zinc-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center text-sm text-zinc-400">
            No restaurants yet.
          </div>
        ) : !hasAnyData ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center text-sm text-zinc-400">
            No events recorded yet. Numbers appear here once diners start scanning
            menus.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3 font-medium">Restaurant</th>
                  <th className="px-3 py-3 text-right font-medium">Scans</th>
                  <th className="px-3 py-3 text-right font-medium">Views</th>
                  <th className="px-3 py-3 text-right font-medium">Visitors</th>
                  <th className="px-3 py-3 text-right font-medium">
                    Show→server
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Conv.</th>
                  <th className="px-4 py-3 font-medium">Languages</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 last:border-0 align-top"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {r.name_en ?? r.name_native}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {r.name_native}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.scans}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.views}
                      <div className="text-xs text-zinc-400">
                        {r.views_7d} / 7d
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.visitors}
                      <div className="text-xs text-zinc-400">
                        {r.visitors_7d} / 7d
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.show_visitors}
                      <div className="text-xs text-zinc-400">
                        {r.show_visitors_7d} / 7d
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">
                      {pct(r.conversion)}
                      <div className="text-xs font-normal text-zinc-400">
                        {pct(r.conversion_7d)} / 7d
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.languages.length === 0 ? (
                        <span className="text-zinc-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.languages.map((l) => (
                            <span
                              key={l.locale}
                              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                            >
                              {localeLabel(l.locale)} {l.n}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
