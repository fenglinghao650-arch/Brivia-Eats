# AMap Restaurant Data, MCP, and Skills Reference

Date: 2026-05-11

This note summarizes what AMap appears to offer to developers for restaurant/location data, what remains unclear, and the questions to ask AMap representatives. It is intended as a future reference for Brivia Eats planning.

## Executive Summary

AMap is strong for restaurant identity, POI verification, location, navigation, hours, phone, ratings, average spend, business area, photos, and app handoff.

The public developer docs do not show a full restaurant-menu API. AMap's consumer app may show richer local-life content, including "扫街榜" and store-facing food content, but I did not find a public Web Service, JS SDK, mobile SDK, MCP, or Skill Market document that exposes complete menu data to general developers.

The closest public field is `tag` in POI search/detail responses. In the legacy POI docs, AMap describes this as food POI "特色内容" and says it mainly appears for food POIs as "特色菜", such as a comma-separated list of recommended dishes. That is useful as a weak dish signal, but it is not a structured menu.

## Publicly Documented Restaurant Data

The most relevant public API is Search POI 2.0:

- Keyword search: `https://restapi.amap.com/v5/place/text`
- Nearby search: `https://restapi.amap.com/v5/place/around`
- Polygon search: `https://restapi.amap.com/v5/place/polygon`
- Detail search: `https://restapi.amap.com/v5/place/detail`

Restaurant/category filtering:

- `types=050000` for 餐饮服务.
- Use `region` plus `city_limit=true` to keep search scoped.
- Use `show_fields` to request richer optional data such as `business`, `photos`, `indoor`, `navi`, and `children`.

Publicly documented fields that matter for restaurants:

| Capability | Public docs show? | Notes |
|---|---:|---|
| Restaurant name | Yes | `name` |
| AMap POI id | Yes | `id`; useful as external id |
| Address | Yes | `address`, `pname`, `cityname`, `adname`, `adcode`, `citycode` |
| Coordinates | Yes | `location`; AMap uses GCJ-02 coordinates |
| Category/cuisine | Yes | `type`, `typecode`; `atag` appears in detail/search contexts |
| Phone/contact | Yes | `tel` under business fields |
| Opening hours | Yes | `opentime_today`, `opentime_week` |
| Business area | Yes | `business_area` |
| Rating | Yes | `rating`, documented for dining, hotel, scenic, cinema POIs |
| Average spend | Yes | `cost`, documented for dining, hotel, scenic, cinema POIs |
| Specialty dishes/tags | Partial | `tag`; documented as food-specific特色内容/特色菜 |
| Photos | Yes | `photos.title`, `photos.url` |
| Indoor/floor data | Sometimes | `indoor_map`, `cpid`, `floor`, `truefloor` |
| Navigation point | Yes | `navi_poiid`, `entr_location`, `exit_location`, `gridcode` |
| Full menu | Not found | No structured menu endpoint found in public docs |
| 扫街榜 data | Not found | Consumer-facing product exists, public developer endpoint not found |

Legacy Search POI docs also mention:

- `website`
- `email`
- `alias`
- `groupbuy_num`, gradually deprecated
- `discount_num`, gradually deprecated
- `meal_ordering`, gradually deprecated, and not a full menu API

## MCP Server

AMap MCP Server is intended for AI agents and coding/assistant tools. It exposes AMap location services as callable MCP tools.

Documented capabilities:

- Generate a custom/private AMap travel map from itinerary points and descriptions.
- Generate AMap navigation launch links.
- Generate AMap taxi launch links.
- Geocoding.
- Reverse geocoding.
- IP location.
- Weather.
- Cycling route planning.
- Walking route planning.
- Driving route planning.
- Transit route planning.
- Distance measurement.
- Keyword POI search.
- Nearby POI search.
- POI detail search.

The public npm package `@amap/amap-maps-mcp-server` exposes tools such as:

- `maps_geo`
- `maps_regeocode`
- `maps_ip_location`
- `maps_weather`
- `maps_bicycling`
- `maps_direction_walking`
- `maps_direction_driving`
- `maps_direction_transit_integrated`
- `maps_distance`
- `maps_text_search`
- `maps_around_search`
- `maps_search_detail`

Important limitation: the npm package currently uses older v3 Web Service endpoints for POI search/detail. It returns selected POI fields, not complete restaurant menu data.

## Skill Market

AMap Skill Zone is mostly an AI-development assistant layer, not a direct production API.

Relevant public Skill Market entries:

- 位置服务 Skill: POI search, route planning, geocoding, core LBS services.
- 地图开发 Skill: JSAPI 2.0 WebGL map development, 3D map, overlays, LBS service integration.
- Android Agent Skill: natural-language-driven map/navigation assistant for Android apps.
- iOS Agent Skill: natural-language-driven map/navigation assistant for iOS apps.
- RTOS 地图 Skill: lightweight map rendering and track navigation for watches/RTOS devices.
- 时空洞察 Skill: spatiotemporal business insight, trend/anomaly/opportunity analysis.
- 出行洞察 Skill: route efficiency and service accessibility analysis.

Ready-to-use Skill docs list:

- `amap-jsapi-skill`: helps AI coding tools build maps, markers, layers, 3D view, POI search, geocoding, route planning, drawing/editing tools.
- `amap-lbs-skill`: helps AI coding tools use POI search, nearby search, route planning, tourism planning, heatmap visualization, and AMap search/navigation link generation.

## Product Interpretation For Brivia Eats

AMap is promising as a restaurant/location trust layer:

- Verify a merchant's real-world POI.
- Enrich restaurant profile with public AMap metadata.
- Store AMap POI id and navigation point.
- Add "Open in AMap", route, taxi, or map handoff.
- Build AI travel/food-route experiments using MCP.

AMap should not be assumed to solve full menu acquisition:

- No public full-menu API was found.
- `tag` can help identify specialty dishes, but it is not structured enough for Brivia's menu, allergy, translation, or dietary-trust workflows.
- Full menu access may require a private partnership, merchant authorization, or a separate local-life/merchant data product that is not in the public docs.

## Questions To Ask AMap

Use these questions to clarify whether full menu data is available through public APIs, commercial access, or private partnership.

1. Does AMap provide any public developer API for restaurant menu data?
2. If yes, which API product exposes it: Web Service API, JS API, mobile SDK, MCP Server, Skill Market, merchant platform API, or another product?
3. Is menu data available by AMap POI id?
4. What menu fields are available: dish name, price, category, dish image, description, availability, package/set menu, recommended dishes, spicy level, ingredients, allergens, merchant notes, update time?
5. Are consumer-facing AMap app fields such as 店铺菜单, 推荐菜, 扫街榜, 团购, 优惠, 排队, 订座, or 点餐 exposed to developers?
6. Is the public `tag` field the only dish-level field available through POI search/detail?
7. How should developers interpret `tag`: merchant-provided recommended dishes, AMap-generated specialty tags, user-review-derived dish names, ranking labels, or something else?
8. What is the coverage and freshness of `tag`, `opentime_today`, `opentime_week`, `rating`, `cost`, and `photos` for restaurants?
9. Can menu or merchant profile data be accessed if the restaurant owner authorizes it?
10. Is there a private/commercial data partnership route for restaurant menus or 扫街榜 data?
11. If private access exists, what are the eligibility requirements, pricing model, quota, approval process, and expected timeline?
12. What usage rights come with the data: display only, cache, store long-term, translate, enrich, combine with first-party merchant data, or show outside China?
13. Are there restrictions around displaying AMap ratings, photos, dish tags, or menu content in a third-party restaurant/menu product?
14. What attribution, branding, legal text, or map approval number is required?
15. Are there audit/compliance requirements for storing AMap POI data, photos, or user-facing content?
16. Does MCP Server expose the same data as Web Service API, or can it access richer AMap app/local-life data?
17. Are there upcoming APIs for 扫街榜, local-life rankings, store menus, or merchant content?
18. For an MVP/pilot with a small number of restaurants, what access path does AMap recommend?

## Ready-To-Send Message In Chinese

Subject: 咨询高德开放平台餐饮 POI 与菜单数据开放能力

您好，

我们正在评估高德开放平台在餐饮场景中的能力。我们已经查看了公开文档，包括 Web 服务 API、POI 搜索 2.0、JS API、MCP Server 和 SKILL 专区。公开文档中我们看到高德可以提供餐厅 POI 的名称、地址、经纬度、POI ID、电话、营业时间、评分、人均消费、商圈、照片、特色标签/特色菜、入口导航点等信息。

我们想进一步确认一个关键问题：高德是否向开发者开放餐厅的完整菜单数据？

具体想请教：

1. 高德是否有公开 API 可以通过 POI ID 获取餐厅菜单？
2. 如果有，菜单字段是否包括菜品名称、价格、分类、图片、描述、推荐菜、套餐、供应状态、更新时间等？
3. 高德 App 中用户可见的店铺菜单、推荐菜、扫街榜、团购/优惠、订座/点餐等信息，是否有面向开发者的接口？
4. POI 搜索接口中的 `tag` 字段是否是目前公开接口里唯一的菜品/特色菜相关字段？这个字段的数据来源、覆盖率和更新频率是怎样的？
5. MCP Server 或 SKILL 能否访问比 Web 服务 API 更丰富的餐饮/本地生活数据，还是与公开 Web API 的数据范围一致？
6. 如果完整菜单或扫街榜数据不在公开 API 中，是否可以通过商业合作、私有接口、商家授权、数据合作等方式获取？
7. 如果存在私有或商业合作路径，能否介绍申请条件、可用字段、价格/配额、合规要求、数据使用限制、缓存/存储限制、展示归因要求，以及大致接入周期？
8. 对于一个早期 MVP 或小规模餐厅试点项目，高德建议使用哪种接入方式？

我们的使用场景是为餐厅和国际用户提供多语言菜单、餐厅信息验证和地图导航体验。我们希望在合规前提下使用高德的餐厅 POI 与可能的菜单/本地生活数据，并明确哪些数据可以通过公开开发者能力获得，哪些需要私有合作。

感谢，期待您的建议。

## Ready-To-Send Message In English

Subject: Questions About AMap Restaurant POI and Menu Data Access

Hello,

We are evaluating AMap Open Platform for a restaurant and multilingual menu product. We have reviewed the public docs for Web Service API, POI Search 2.0, JS API, MCP Server, and the Skill Zone. From the public docs, we understand that AMap can provide restaurant POI data such as name, address, coordinates, POI ID, phone number, opening hours, rating, average cost, business area, photos, specialty tags/dishes, and navigation entrance points.

We would like to clarify one key question: does AMap provide restaurant full-menu data to developers?

Specifically:

1. Is there any public API that can retrieve a restaurant menu by AMap POI ID?
2. If yes, which fields are available: dish name, price, category, image, description, recommended dishes, set meals, availability, update time, etc.?
3. Are consumer-facing AMap app features such as store menus, recommended dishes, 扫街榜, discounts/group-buying, reservation, or ordering exposed through any developer API?
4. Is the POI `tag` field currently the only public dish-related field? What is its source, coverage, and freshness?
5. Does MCP Server or the Skill Market expose richer restaurant/local-life data than the Web Service API?
6. If full menu or 扫街榜 data is not publicly available, can it be accessed through commercial partnership, private API, merchant authorization, or data partnership?
7. If private/commercial access exists, could you share the eligibility requirements, fields available, pricing/quota model, compliance requirements, usage restrictions, cache/storage rules, attribution requirements, and expected integration timeline?
8. For an early MVP or small restaurant pilot, which integration path would AMap recommend?

Our use case is to provide multilingual menus, restaurant information verification, and map/navigation experiences for restaurants and international diners. We want to understand what is available through normal developer access and what requires private partnership.

Thank you.

## Sources

- AMap API index: https://lbs.amap.com/api
- Web Service API overview: https://lbs.amap.com/api/webservice/summary
- Search POI 2.0: https://lbs.amap.com/api/webservice/guide/api-advanced/newpoisearch
- Legacy Search POI: https://lbs.amap.com/api/webservice/guide/api-advanced/search
- JS API 2.0: https://lbs.amap.com/api/javascript-api-v2/summary
- MCP Server overview: https://lbs.amap.com/api/mcp-server/summary
- MCP Server quick start: https://lbs.amap.com/api/mcp-server/gettingstarted
- MCP Server changelog: https://lbs.amap.com/api/mcp-server/changelog
- Skill Zone: https://lbs.amap.com/ai/skillzone
- Ready-to-use Skills: https://lbs.amap.com/api/skill/ready-to-use/summary
- AIoT SDK Skills: https://lbs.amap.com/api/skill/developer-skills/aiot-skills
