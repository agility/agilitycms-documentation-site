# Content Refresh Plan — Frameworks, SDKs & APIs

**Status:** Approved-pending-execution · **Owner:** Joel Varty · **Scope:** the **SDKs & Frameworks** category (`categoryID 6`) in the docs instance `67bc73e6-u`
**Audit date:** 2026-07-28 · **Companion skill:** [.claude/skills/audit-framework-docs/SKILL.md](../.claude/skills/audit-framework-docs/SKILL.md)
**Related:** [rebuild-plan-2026.md](rebuild-plan-2026.md) (site rebuild) · [authoring-agility-docs skill](../.claude/skills/authoring-agility-docs/SKILL.md) (how to write/place articles)

---

## 0. Goal

Do a **complete audit** of every framework, SDK, and API doc, get it all current and accurate, retire what's dead, publish what's finished, and then **keep it from drifting** via a repeatable audit skill run on a schedule. This document is the living record of that effort; the skill is the mechanism that keeps it honest.

> **How these two fit together:** the skill *produces* the state table in §3 (it's an auditor, not an author). This plan *decides what to do* about what the skill finds. Re-run the skill, paste its report into §3, work the backlog.

---

## 1. How this content is modeled (context for anyone picking this up)

Each framework/SDK is a **pair of containers** sharing the `DocArticle` / `DocSection` models: `<Name>Articles` + `<Name>Sections`. Category = which container an article lives in; sidebar placement = its `Section_ValueField`. Full map is in the [authoring skill](../.claude/skills/authoring-agility-docs/SKILL.md). The "APIs & SDKs" nav dropdown is driven by the **`Header_Link`** nested list on the `header` container — **nav membership and article existence are independent**, which is exactly how drift creeps in (see SvelteKit below).

Key gotchas that bite this work: list calls default to 50 / cap at 250 (always pass `take: 250`); the MCP **cannot publish, unpublish, set workflow state, or delete** — those are manual Agility-UI steps; reference-name case matters on write.

---

## 2. Tiers (drives effort allocation)

| Tier | Frameworks | Policy |
|---|---|---|
| **1 — Flagship** | Next.js, .NET, JavaScript SDK | Continuously current; audited every cycle; highest effort |
| **2 — Active** | Astro, Angular, Blazor, SvelteKit *(once written)* | Keep; expand where thin; audited every cycle |
| **3 — Legacy (archived)** | Gatsby | Archive convention (§4): banner + `noindex` + removed from nav; URLs stay alive |
| **Watch-list** | Nuxt, Eleventy | 2021-era; refresh-or-archive decision pending an analytics check |

---

## 3. Audit findings & per-framework status (as of 2026-07-28)

> Freshness note: nearly every article carries a **2025-12-17/18 `lastModified`** that is a **bulk schema touch**, not editorial work (identical timestamps to the millisecond). Real vintage below is taken from `createdDate` and the genuine outliers. The audit skill knows to ignore the bulk-touch timestamp.

| Framework | Container (ID) | Articles | Real vintage | State | Nav? | Verdict |
|---|---|---|---|---|---|---|
| **Next.js** | `NextjsArticles` (49) | 25 | Mostly 2021–22; a few Nov 2025–Jan 2026 | 24 pub, 1 unpub | ✅ | 🟢 Flagship — audit & refresh (Phase 4) |
| **.NET** | `dotNetArticles` (53) | 18 | Rebuilt Jan 2026 + Mgmt-SDK staged Feb 2026 | 11 pub, 7 staging | ✅ | 🟢 Recent — publish staged 7 (Phase 1) |
| **JavaScript** (core SDK) | `JavaScriptArticles` (55) | 10 | Content Fetch/Sync (2021, one 2025) + Mgmt-SDK (2025) | 8 pub, 2 staging | ✅ | 🟢 Core — keep & update |
| **Astro** | `AstroArticles` (278) | 4 | 2024 | Published | ✅ | 🟡 Fresh but thin — expand (Phase 4) |
| **Angular** | `AngularArticles` (54) | 5 | 2021 + Angular 18 starter (2024) | Published | ✅ | 🟡 Partially current — update (Phase 4) |
| **Nuxt** | `NuxtArticles` (51) | 5 | 2021, last edit 2023 | Published | ✅ | 🟡 Watch-list — refresh or archive |
| **Eleventy** | `EleventyArticles` (52) | 5 | 2021 | Published | ✅ | 🟠 Watch-list — refresh or archive |
| **Gatsby** | `GatsbyArticles` (50) | 7 | All 2021 | Published | ✅→❌ | 🔴 **Archive** — references dead Gatsby Cloud |
| **SvelteKit** | `SvelteKitArticles` (337) | 10 | Feb–Mar 2025 | **All 10 staging** | ✅→❌ | ⚠️ 2 written, 8 empty/stub — finish then publish |
| **Management SDK** | `ManagementSDK-Articles` (354) | 2 | 2025–26 | Both staging | ❌ | 🔴 Fragmented across 3 containers — consolidate |

### Notable findings the audit surfaced

1. **Blazor already exists** — a published "Blazor SSR Starter" article (`1379`, Jan 2026) under `.NET`, pointing at [agilitycms-dotnet-starter/.../Agility.NET.Blazor.Starter](https://github.com/agility/agilitycms-dotnet-starter/tree/main/Agility.NET.Blazor.Starter). Not a from-scratch add.
2. **SvelteKit is a ghost in the nav** — it's in the dropdown, but all 10 articles are staging and **8 are empty or a stub** (only "SvelteKit and Agility CMS" and "Features & Benefits" have real content; "Pages" is a 3-block stub; Components / Content Lists / Routing & Sitemaps / Deploy-to-Vercel/Netlify/Azure/AWS have **no body**).
3. **Management SDK is scattered across 3 containers** — dedicated `ManagementSDK-Articles` (2 staged), 7 "Management SDK –" articles inside `JavaScript`, 7 more staged inside `.NET`. Not in the nav at all.
4. **Gatsby documents a dead product** — "Deploying to Gatsby Cloud" & "Configure Gatsby Cloud Previews" describe a service shut down in 2023.
5. **Nav dropdown members** (today): Next.js, .NET, Gatsby, Nuxt, Eleventy, Angular, JavaScript, Python *(GitHub only)*, PHP *(GitHub only)*, Astro, Web Studio SDK *(GitHub only)*, SvelteKit. **Absent:** Management SDK, Blazor.

---

## 4. The deprecation / archive convention (build once, reuse)

Establish a reusable "Legacy" mechanism so dead frameworks don't rot in place or mislead readers:

- **Legacy banner** — a `CalloutBlock` (`Style: caution`) at the top of each archived article: *"This framework is no longer actively maintained. It may reference outdated tooling."* Prepend to the article body.
- **`noindex`** — archived pages must return `noindex` (the site already supports `ROBOTS_NO_INDEX` and per-article meta via the metadata resolver). Wire a per-container or per-article signal.
- **Remove from nav** — delete the framework's `Header_Link` item from the "APIs & SDKs" dropdown.
- **Keep URLs alive** — no redirects/deletes, so external deep links don't 404.

---

## 5. Phased execution

### Phase 0 — Deprecation convention *(prerequisite, ~1 day)*
Build the Legacy banner + `noindex` signal + document the nav-removal step. Blocks the Gatsby archive.

### Phase 1 — Fast wins *(days)*
1. **Archive Gatsby** (7 articles) via §4; priority on the two dead-Gatsby-Cloud pages. Remove `Header_Link` for Gatsby.
2. **Drop SvelteKit from nav** — remove its `Header_Link` until the section is real (articles stay in staging).
3. **Publish ready .NET** — the 7 staged .NET Management SDK articles + starter set are complete; publish (manual UI step). Coordinate with Phase 3.
4. **Add Blazor nav** — new `Header_Link` for **Blazor** pointing at the .NET Blazor content. *(Decision: Blazor lives inside .NET docs but gets its own framework-nav entry.)*

### Phase 2 — Finish SvelteKit → re-add to nav
Author the 8 missing/stub articles (sections exist: *Introduction* 1187, *How it works* 1205, *Deployment* 1210):
- Finish stub: **Pages**
- Write empties: **Components, Content Lists, Routing & Sitemaps** (core "How it works")
- Write empties: **Deploying to Vercel / Netlify / Azure / AWS**
- Fix "Features & Benefits" `Description` (currently literally `"Test"`).
- Source of truth: [agility/sveltekit-starter](https://github.com/agility/sveltekit-starter). Author via the [authoring skill](../.claude/skills/authoring-agility-docs/SKILL.md).
- **Publish all 10 → re-add SvelteKit `Header_Link`.**

### Phase 3 — Consolidate Management SDK *(language tabs)*
- Make `ManagementSDK-Articles` the single source of truth; present JS / .NET via code-tabs, not parallel article trees.
- Migrate/redirect the Management-SDK articles currently inside `JavaScript` and `.NET`.
- Add a **Management SDK** entry to the nav dropdown.
- **Open sub-decision:** per-language tabs *inside one article* vs. one article per language under language sub-sections. Resolve before migrating.

### Phase 4 — Flagship refresh *(weeks, ongoing)*
- **Next.js** (25 articles, mostly 2021–22): retire/merge dated guides (AWS EC2, AWS Amplify, Storybook, Commerce starter, Netlify — assess each); Google Optimize already unpublished → archive formally; align core guides to **App Router + Cache Components** (dogfooding — the stack this docs site now runs on).
- **Angular** — refresh 2021 articles against the Angular 18 SSR starter (2024).
- **Astro** — expand (only 4 articles): content-fetch, components, deployment depth.
- **Blazor** — expand within .NET: Getting Started / Fetching Content / Components / Deploy alongside the existing starter page.
- **Nuxt & Eleventy** — resolve watch-list: refresh to current (Nuxt 3/4; Eleventy 3) or archive via §4. **Gate on usage data.** ⚠️ *As of 2026-07-28 the docs site is **not instrumented** — PostHog has no `/docs/*` pageviews (repo has no analytics snippet; only dev `localhost:3000/docs` noise exists over the trailing year).* Until instrumented, base this decision on **Algolia search-query analytics** (index `doc_site` — top queries reveal framework demand) and/or **Google Search Console** impressions per `/docs/...` URL. See §7.

### Phase 5 — New frameworks (evaluate on demand)
- **Doc pages for Python & PHP SDKs** (nav today links only to GitHub; no doc pages).
- **Remix / React Router 7**, **SolidStart**, **standalone Vue** — scope against demand.

---

## 6. Continual audit (anti-drift)

Run the [audit-framework-docs skill](../.claude/skills/audit-framework-docs/SKILL.md) on a cadence (recommend **monthly**, and before any framework-docs release). It flags: staging backlogs, empty/stub articles, nav-vs-content mismatches, dead-product references, framework-version drift, and articles past a staleness threshold — then emits a report to paste into §3. It **audits only**; remediation follows this plan and the authoring skill.

A scheduled cloud agent (`/schedule`) or a `/loop` can run it; the skill itself is host-agnostic and read-only against the CMS.

---

## 7. Usage data & instrumentation gap

Traffic data should drive tiering (§2) and the Next.js refresh ranking (Phase 4). **Gap discovered 2026-07-28:** the docs site emitted no analytics — PostHog project "New UI Production & Website" (33241) had **zero `/docs/*` pageviews** and the repo had no analytics snippet.

**Resolved 2026-07-28 — the docs site is now instrumented:**

1. **PostHog** — `posthog-js` wired in [lib/analytics/posthog.ts](../lib/analytics/posthog.ts), initialized + `$pageview` on route change in [components/common/ClientInit.ts](../components/common/ClientInit.ts). Client-only init (Cache-Components-safe), `basePath`-aware, host-neutral. **Opt-in:** no-ops until `NEXT_PUBLIC_POSTHOG_KEY` is set — ⚠️ *set the key in the docs project's env to start collecting.* Autocapture covers clicks; structured events `docs_search` / `docs_search_result_click` / `docs_quicklink_click` come from the search UI.
2. **Algolia** — the search UI ([SearchModal.tsx](../components/common/SearchModal.tsx)) now sends Insights click events (`clickAnalytics:true` + [lib/analytics/algoliaInsights.ts](../lib/analytics/algoliaInsights.ts)) so Algolia reports CTR / click position. Query data was already logged server-side. Read it with the [algolia-search-analytics skill](../.claude/skills/algolia-search-analytics/SKILL.md) — **no-result searches surface content gaps and demand for undocumented frameworks** (feeds Phase 5); needs a key with the `analytics` ACL (`ALGOLIA_ANALYTICS_API_KEY`).

**Remaining:** set the PostHog key in prod, then allow a few weeks of collection before the Nuxt/Eleventy archive-vs-refresh call. Algolia's historical search queries can inform it immediately.

## 8. Decision log

| Date | Decision |
|---|---|
| 2026-07-28 | Dead frameworks → **archive + `noindex` + drop from nav**, keep URLs alive (Gatsby first). |
| 2026-07-28 | SvelteKit → **drop from nav now**; finish the 8 empty/stub articles, then publish + re-add. |
| 2026-07-28 | Blazor → **lives in .NET docs** but **gets its own framework-nav entry**. |
| 2026-07-28 | Management SDK → **consolidate into one section with per-language tabs**; add to nav. |
| 2026-07-28 | Nuxt / Eleventy → **watch-list**; refresh-or-archive gated on usage data (see §7). |
| 2026-07-28 | Docs site **instrumented**: PostHog (pageviews + search events) and Algolia Insights (click analytics). PostHog key still to be set in prod. |
