// Server-side only - never import from client components or NEXT_PUBLIC context
import { ProxyAgent, request } from "undici";

const BASE = "https://restapi.amap.com";
let proxyAgent: ProxyAgent | null = null;

// Official AMap POI type codes under 餐饮服务, excluding the broad parent
// bucket 050000 so discovery starts with service-side restaurant precision.
export const AMAP_RESTAURANT_TYPE_CODES = [
  "050100",
  "050101",
  "050102",
  "050103",
  "050104",
  "050105",
  "050106",
  "050107",
  "050108",
  "050109",
  "050110",
  "050111",
  "050112",
  "050113",
  "050114",
  "050115",
  "050116",
  "050117",
  "050118",
  "050119",
  "050120",
  "050121",
  "050122",
  "050123",
  "050200",
  "050201",
  "050202",
  "050203",
  "050204",
  "050205",
  "050206",
  "050207",
  "050208",
  "050209",
  "050210",
  "050211",
  "050212",
  "050213",
  "050214",
  "050215",
  "050216",
  "050217",
  "050300",
  "050400",
  "050500",
  "050600",
  "050700",
  "050800",
  "050900",
] as const;

export const AMAP_RESTAURANT_TYPES = AMAP_RESTAURANT_TYPE_CODES.join("|");

const AMAP_RESTAURANT_TYPE_CODE_SET = new Set<string>(AMAP_RESTAURANT_TYPE_CODES);

export function isAmapRestaurantPrimaryType(typecode: string | null | undefined): boolean {
  const primaryTypecode = typecode?.split("|")[0]?.trim() ?? "";
  return AMAP_RESTAURANT_TYPE_CODE_SET.has(primaryTypecode);
}

export class AmapWebServiceError extends Error {
  status?: string;
  infocode?: string;
  httpStatus?: number;

  constructor(message: string, details?: { status?: string; infocode?: string; httpStatus?: number }) {
    super(message);
    this.name = "AmapWebServiceError";
    this.status = details?.status;
    this.infocode = details?.infocode;
    this.httpStatus = details?.httpStatus;
  }
}

function getKey(): string {
  const k = process.env.AMAP_WEB_SERVICE_KEY;
  if (!k) throw new Error("AMAP_WEB_SERVICE_KEY is not set");
  return k;
}

export type AmapPoi = {
  poi_id: string;
  name: string;
  address: string;
  adcode?: string;
  cityname?: string;
  pname?: string;
  adname?: string;
  location: string; // "lng,lat" - GCJ-02
  geo_lng: number | null;
  geo_lat: number | null;
  type: string;
  typecode: string;
  tel?: string;
  rating?: string;
  cost?: string;
  opentime_today?: string;
  opentime_week?: string;
  business_area?: string;
  tag?: string;
  navi_poiid?: string;
  entr_location?: string;
  photos?: { title: string; url: string }[];
  raw: Record<string, unknown>;
};

export type GeocodeResult = {
  geo_lng: number;
  geo_lat: number;
  formatted_address: string;
  adcode: string;
};

async function fetchAmapJson(
  path: string,
  params: URLSearchParams
): Promise<Record<string, unknown>> {
  params.set("key", getKey());
  params.set("output", "JSON");

  const url = `${BASE}${path}?${params}`;
  let statusCode: number;
  let text: string;
  try {
    const proxyUrl =
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy;
    const res = await request(url, {
      dispatcher: proxyUrl ? getProxyAgent(proxyUrl) : undefined,
    });
    statusCode = res.statusCode;
    text = await res.body.text();
  } catch (err) {
    throw new AmapWebServiceError(
      err instanceof Error ? err.message : "AMap network request failed"
    );
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new AmapWebServiceError("AMap returned a non-JSON response", {
      httpStatus: statusCode,
    });
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new AmapWebServiceError("AMap HTTP request failed", {
      httpStatus: statusCode,
    });
  }

  if (json.status !== "1") {
    throw new AmapWebServiceError(
      typeof json.info === "string" ? json.info : "AMap request failed",
      {
        status: typeof json.status === "string" ? json.status : undefined,
        infocode: typeof json.infocode === "string" ? json.infocode : undefined,
      }
    );
  }

  return json;
}

function getProxyAgent(proxyUrl: string): ProxyAgent {
  if (!proxyAgent) {
    proxyAgent = new ProxyAgent(proxyUrl);
  }
  return proxyAgent;
}

// Geocode an address to GCJ-02 coordinates
export async function geocode(
  address: string,
  city: string
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    address,
    city,
  });
  const json = await fetchAmapJson("/v3/geocode/geo", params);
  const geocodes = json.geocodes as Record<string, unknown>[] | undefined;
  if (!geocodes?.length) return null;
  const g = geocodes[0];
  const [lng, lat] = (g.location as string).split(",").map(Number);
  return {
    geo_lng: lng,
    geo_lat: lat,
    formatted_address: g.formatted_address as string,
    adcode: g.adcode as string,
  };
}

// Search restaurant/food-service POIs by keyword within a city.
export async function poiSearch(
  keywords: string,
  city: string,
  types = AMAP_RESTAURANT_TYPES,
  pageSize = 10,
  pageNum = 1
): Promise<AmapPoi[]> {
  const params = new URLSearchParams({
    keywords,
    region: city,
    city_limit: "true",
    types,
    page_size: String(Math.min(Math.max(pageSize, 1), 25)),
    page_num: String(Math.max(pageNum, 1)),
    show_fields: "business,photos,navi",
  });
  const json = await fetchAmapJson("/v5/place/text", params);
  const pois = json.pois as Record<string, unknown>[] | undefined;
  if (!pois?.length) return [];
  return pois.map(parsePoi);
}

// City-level restaurant discovery using concrete 餐饮服务 subcategories.
export async function restaurantPoiSearchByCity(
  city: string,
  pageSize = 25,
  pageNum = 1,
  keywords?: string
): Promise<AmapPoi[]> {
  const params = new URLSearchParams({
    region: city,
    city_limit: "true",
    types: AMAP_RESTAURANT_TYPES,
    page_size: String(Math.min(Math.max(pageSize, 1), 25)),
    page_num: String(Math.max(pageNum, 1)),
    show_fields: "business,photos,navi",
  });
  if (keywords) params.set("keywords", keywords);
  const json = await fetchAmapJson("/v5/place/text", params);
  const pois = json.pois as Record<string, unknown>[] | undefined;
  if (!pois?.length) return [];
  return pois.map(parsePoi);
}

// Search restaurant POIs within a viewport rectangle (SW + NE corners, GCJ-02).
export async function restaurantPoiSearchByBounds(
  swLng: number,
  swLat: number,
  neLng: number,
  neLat: number,
  pageSize = 25,
  pageNum = 1
): Promise<AmapPoi[]> {
  const polygon = [
    `${swLng},${swLat}`,
    `${neLng},${swLat}`,
    `${neLng},${neLat}`,
    `${swLng},${neLat}`,
  ].join("|");
  const params = new URLSearchParams({
    polygon,
    types: AMAP_RESTAURANT_TYPES,
    page_size: String(Math.min(Math.max(pageSize, 1), 25)),
    page_num: String(Math.max(pageNum, 1)),
    show_fields: "business,photos,navi",
  });
  const json = await fetchAmapJson("/v5/place/polygon", params);
  const pois = json.pois as Record<string, unknown>[] | undefined;
  if (!pois?.length) return [];
  return pois.map(parsePoi);
}

// Fetch full detail for a single POI by AMap POI ID
export async function poiDetail(poiId: string): Promise<AmapPoi | null> {
  const params = new URLSearchParams({
    id: poiId,
    show_fields: "business,photos,children,navi",
  });
  const json = await fetchAmapJson("/v5/place/detail", params);
  const pois = json.pois as Record<string, unknown>[] | undefined;
  if (!pois?.length) return null;
  return parsePoi(pois[0] as Record<string, unknown>);
}

function parsePoi(poi: Record<string, unknown>): AmapPoi {
  const business = (poi.business ?? {}) as Record<string, unknown>;
  const navi = (poi.navi ?? {}) as Record<string, unknown>;
  const location = (poi.location as string) ?? "";
  const [lng, lat] = location.split(",").map(Number);
  return {
    poi_id: poi.id as string,
    name: poi.name as string,
    address: (poi.address as string) ?? "",
    adcode: stringOrUndefined(poi.adcode),
    cityname: stringOrUndefined(poi.cityname),
    pname: stringOrUndefined(poi.pname),
    adname: stringOrUndefined(poi.adname),
    location,
    geo_lng: Number.isFinite(lng) ? lng : null,
    geo_lat: Number.isFinite(lat) ? lat : null,
    type: (poi.type as string) ?? "",
    typecode: (poi.typecode as string) ?? "",
    tel: stringOrUndefined(business.tel),
    rating: stringOrUndefined(business.rating),
    cost: stringOrUndefined(business.cost),
    opentime_today: stringOrUndefined(business.opentime_today),
    opentime_week: stringOrUndefined(business.opentime_week),
    business_area: stringOrUndefined(business.business_area),
    tag: stringOrUndefined(poi.tag) ?? stringOrUndefined(business.tag),
    navi_poiid: stringOrUndefined(navi.navi_poiid),
    entr_location: stringOrUndefined(navi.entr_location),
    photos: (poi.photos as { title: string; url: string }[]) ?? [],
    raw: poi,
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
