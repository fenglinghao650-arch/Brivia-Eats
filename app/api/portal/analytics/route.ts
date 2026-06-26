import { NextResponse } from "next/server";
import { db } from "@/src/db";

// GET /api/portal/analytics — validation dashboard data.
// Gated by proxy.ts (admin only). Returns per-restaurant usage: scans, menu
// views, unique visitors, show-to-server, and a per-PERSON conversion rate
// (distinct visitors who reached Show-to-server ÷ distinct visitors who viewed
// the menu). All-time totals plus a last-7-days window, and a language mix.

type MetricRow = {
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
};

type LangRow = { restaurant_id: string; locale: string; n: number };

export async function GET() {
  try {
    const metrics = await db.query<MetricRow>(`
      SELECT
        r.id,
        r.name_native,
        r.name_en,
        COUNT(*) FILTER (WHERE e.event_type = 'qr_scan')::int AS scans,
        COUNT(*) FILTER (WHERE e.event_type = 'menu_view')::int AS views,
        COUNT(DISTINCT e.session_id)
          FILTER (WHERE e.event_type = 'menu_view')::int AS visitors,
        COUNT(*) FILTER (WHERE e.event_type = 'show_to_server')::int AS show_events,
        COUNT(DISTINCT e.session_id)
          FILTER (WHERE e.event_type = 'show_to_server')::int AS show_visitors,
        COUNT(*) FILTER (
          WHERE e.event_type = 'menu_view'
            AND e.created_at >= now() - interval '7 days')::int AS views_7d,
        COUNT(DISTINCT e.session_id) FILTER (
          WHERE e.event_type = 'menu_view'
            AND e.created_at >= now() - interval '7 days')::int AS visitors_7d,
        COUNT(DISTINCT e.session_id) FILTER (
          WHERE e.event_type = 'show_to_server'
            AND e.created_at >= now() - interval '7 days')::int AS show_visitors_7d
      FROM restaurants r
      LEFT JOIN analytics_events e ON e.restaurant_id = r.id
      GROUP BY r.id, r.name_native, r.name_en
      ORDER BY views DESC, r.name_native ASC
    `);

    const langs = await db.query<LangRow>(`
      SELECT restaurant_id, locale, COUNT(*)::int AS n
      FROM analytics_events
      WHERE event_type = 'menu_view'
        AND restaurant_id IS NOT NULL
        AND locale IS NOT NULL
      GROUP BY restaurant_id, locale
    `);

    const langByRestaurant = new Map<string, { locale: string; n: number }[]>();
    for (const row of langs) {
      const list = langByRestaurant.get(row.restaurant_id) ?? [];
      list.push({ locale: row.locale, n: row.n });
      langByRestaurant.set(row.restaurant_id, list);
    }

    const restaurants = metrics.map((m) => {
      const languages = (langByRestaurant.get(m.id) ?? []).sort(
        (a, b) => b.n - a.n
      );
      // Per-person intent: of the people who viewed the menu, what share reached
      // Show-to-server. null when nobody has viewed yet (so the UI shows "—").
      const conversion =
        m.visitors > 0 ? m.show_visitors / m.visitors : null;
      const conversion7d =
        m.visitors_7d > 0 ? m.show_visitors_7d / m.visitors_7d : null;
      return { ...m, languages, conversion, conversion_7d: conversion7d };
    });

    const totals = restaurants.reduce(
      (acc, r) => {
        acc.scans += r.scans;
        acc.views += r.views;
        acc.show_events += r.show_events;
        return acc;
      },
      { scans: 0, views: 0, show_events: 0 }
    );

    return NextResponse.json({ restaurants, totals });
  } catch (err) {
    console.error("[GET /api/portal/analytics]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
