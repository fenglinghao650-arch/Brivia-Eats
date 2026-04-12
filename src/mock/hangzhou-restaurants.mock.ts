/**
 * Additional Hangzhou restaurant stubs for map demo.
 * Coordinates are approximate GCJ-02 values.
 */

import type { Restaurant } from "./types.mock";
import { restaurant as louwailou } from "./louwailou.mock";

const zhiweiguan: Restaurant = {
  id: "rest_zhiweiguan",
  name_zh: "知味观",
  name_en: "Zhi Wei Guan",
  location_display: "Shangcheng, Hubin",
  cuisine_display: "Specialty Snack Hub",
  cuisine_tags: ["Snacks & Tea Pastries"],
  tagline: "The taste of the season since 1913",
  description:
    "The most accessible place to sample Hangzhou's ritual of leisure — seasonal dim sum, Longjing tea pastries, and glutinous rice snacks locals return to year-round.",
  geo_lat: 30.246,
  geo_lng: 120.17,
};

const waipojia: Restaurant = {
  id: "rest_waipojia",
  name_zh: "外婆家",
  name_en: "Grandma's Home",
  location_display: "Hubin, Hangzhou",
  cuisine_display: "Home-style Hangbang Cai",
  cuisine_tags: ["West Lake Heritage"],
  tagline: "Hangzhou comfort food loved by locals",
  description:
    "A beloved chain serving affordable home-style City Cuisine — the domestic poultry and meat side of Hangbang Cai, in a warm family-friendly setting.",
  geo_lat: 30.259,
  geo_lng: 120.158,
};

const kuiyuanguan: Restaurant = {
  id: "rest_kuiyuanguan",
  name_zh: "奎元馆",
  name_en: "Kui Yuan Guan",
  location_display: "Shangcheng, Jiefang Road",
  cuisine_display: "Noodle King of Jiangnan",
  cuisine_tags: ["Local Noodles"],
  tagline: "150 years of the scholar's noodle tradition",
  description:
    "Qing Dynasty heritage noodle house famous for Pian'erchuan — soup noodles with wild rice stem, shredded pork, and preserved Xuecai greens that give the broth its deep umami depth.",
  geo_lat: 30.247,
  geo_lng: 120.169,
};

/** All Hangzhou restaurants available for the map */
export const hangzhouRestaurants: Restaurant[] = [
  louwailou,
  zhiweiguan,
  waipojia,
  kuiyuanguan,
];
