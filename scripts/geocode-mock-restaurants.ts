/**
 * Looks up real AMap GCJ-02 coordinates for each mock restaurant.
 * Run: npx tsx scripts/geocode-mock-restaurants.ts
 * Requires AMAP_WEB_SERVICE_KEY in .env.local
 */

import "dotenv/config";
import { poiSearch } from "../src/lib/amap-web-service";

const restaurants = [
  { id: "rest_louwailou",   name: "楼外楼饭店", city: "杭州" },
  { id: "rest_zhiweiguan",  name: "知味观",     city: "杭州" },
  { id: "rest_waipojia",    name: "外婆家",     city: "杭州" },
  { id: "rest_kuiyuanguan", name: "奎元馆",     city: "杭州" },
];

async function main() {
  console.log("Looking up AMap POI coordinates...\n");

  for (const r of restaurants) {
    const results = await poiSearch(r.name, r.city);

    if (!results.length) {
      console.log(`❌  ${r.id}: no results`);
      continue;
    }

    // Print top 3 candidates so you can pick the right branch
    console.log(`✅  ${r.id} — top ${Math.min(3, results.length)} results:`);
    results.slice(0, 3).forEach((p, i) => {
      console.log(
        `    [${i + 1}] geo_lat: ${p.geo_lat}, geo_lng: ${p.geo_lng}` +
        `  |  ${p.name}  |  ${p.address}` +
        (p.rating ? `  |  ★${p.rating}` : "") +
        (p.cost ? `  |  ¥${p.cost}` : "")
      );
    });
    console.log();
  }
}

main().catch(console.error);
