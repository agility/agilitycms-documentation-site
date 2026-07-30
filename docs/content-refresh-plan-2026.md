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

Key gotchas that bite this work: list calls default to 50 / cap at 250 (always pass `take: 250`); `save_content_items` always writes to **Staging** (`state` is ignored on save), though the MCP **can** publish via `publish_content` — treat that as outward-facing and confirm first (§8); reference-name case matters on write.

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

A reusable "Legacy" mechanism so dead frameworks don't rot in place or mislead readers. **Implemented — one registry entry in [lib/docs/legacyFrameworks.ts](../lib/docs/legacyFrameworks.ts) does all four:**

- **Legacy banner** — `LegacyNotice` (ocean `caution` styling) above the article body on every page under the archived path.
- **`noindex`** — archived paths only (see the §8 warning about what *not* to use as a robots signal).
- **Removed from nav** — filtered in `groupNavLinks`, so desktop **and** mobile update together. No CMS deletion required.
- **URLs stay alive** — no redirects/deletes, so external deep links don't 404.

To archive a framework: add `{ path, name, status: "archived", reason, successor }`. To hide one that isn't ready (SvelteKit): `status: "hidden"`.

---

## 5. Phased execution

### Phase 0 — Deprecation convention ✅ **DONE 2026-07-28**
Implemented as a **code registry** rather than per-article CMS edits: [lib/docs/legacyFrameworks.ts](../lib/docs/legacyFrameworks.ts) is the single source of truth. One entry simultaneously drives the Legacy banner ([LegacyNotice.tsx](../components/common/LegacyNotice.tsx), rendered by `DynamicArticleDetails`), `noindex` ([resolveAgilityMetaData.ts](../lib/cms-content/resolveAgilityMetaData.ts)), and removal from **both** nav surfaces ([Header.tsx](../components/common/Header.tsx) `groupNavLinks`). URLs stay live.

*Why code over CMS banners:* consistent copy, applies to new articles in the section automatically, no per-article publish, and un-archiving is a one-line revert. The CMS stays the source of truth for article *content*; this file records only lifecycle.

### Phase 1 — Fast wins
1. ✅ **Archive Gatsby** — all 7 articles + the `/gatsby` landing now show the Legacy banner and return `noindex`; Gatsby is filtered from the nav. *(Verified in-browser.)*
2. ✅ **Drop SvelteKit from nav** — registry entry `status: "hidden"`; articles untouched in staging. **Superseded 2026-07-29:** Phase 2 shipped, entry removed, SvelteKit is back in the nav.
3. ✅ **Publish ready .NET** — the 7 staged Management SDK articles (1405–1411) **published 2026-07-29** (verified rendering at `/dotNet/management-sdk-dotnet-*`), along with the 2 JavaScript Mgmt-SDK articles (290, 1277) and their staged sections.
4. ✅ **Add Blazor nav** — `Header_Link` **1595** → `~/dotnet/blazor-starter`, `Icon: blazor`. **Published 2026-07-29** along with all 16 icon'd nav Link items.

### Phase 2 — Finish SvelteKit → re-add to nav
✅ **Authored 2026-07-29 (staged)** — all 8 missing/stub articles written in Markdown, grounded in a fresh clone of [agility/sveltekit-starter](https://github.com/agility/sveltekit-starter) (SvelteKit 2 / Svelte 5, `@agility/content-fetch`, `adapter-auto`):
- **How it works:** Routing & Sitemaps (1209 — catch-all `[...path]`, `getPageByPath`, `entries()` prerender), Pages (1206 — was the stub), Components (1207 — ContentZone registry + add-your-own), Content Lists (1208 — linked content via depth, PostDetails, direct `getContentList`).
- **Deployment:** Vercel (1211), Netlify (1212), Azure (1213 — SWA community adapter or App Service/adapter-node), AWS (1214 — Amplify/SST/adapter-node). All four document the **build-hook-on-publish** requirement (the starter prerenders, so publishes need a rebuild) and the `$env/static/private` build-time-inlining gotcha.
- Fixed "Features & Benefits" (1202): `Description` was literally `"Test"` → real copy; body converted to clean Markdown.
- All cross-linked; verified rendering in local preview (dev serves staging).

✅ **Published 2026-07-29** — all 10 articles + the full dependency chain: 4 `SvelteKitSections`, DocCategory **1177** (the SidebarNav's category pointer — leaving it staged 500'd the whole section), landing page 44 + dynamic page 46 and their module items (1182/1183/1162/1204), and `Header_Link` 1179. The `status: "hidden"` entry removed from [lib/docs/legacyFrameworks.ts](../lib/docs/legacyFrameworks.ts) (`64a8efe`). **Verified end-to-end on the rebuild deployment** (landing + all 9 article pages render with code blocks).

> **Publish-dependency lesson (recorded for future publishes):** an article's page render needs its whole chain published — article → its `*Sections` items → the category's `DocCategories` item → the landing/dynamic pages + their SidebarNav/Hero/Details module items. A staged `DocCategory` fails the section server-side (error boundary), and staged sections make sidebars silently empty. The rebuild deployment's caches are tag-driven: after any MCP publish, fire the same payloads at `{deploy}/docs/api/revalidate` (Agility's webhook only targets production).

### Phase 3 — Consolidate Management SDK *(language tabs)*
- Make the Management SDK container the single source of truth; present JS / .NET via code-tabs, not parallel article trees.
- Migrate/redirect the Management-SDK articles currently inside `JavaScript` and `.NET`.
- Add a **Management SDK** entry to the nav dropdown.
- ✅ **Sub-decision resolved 2026-07-29:** real **code-tabs** (not stacked sections, not parallel trees). Component shipped — see below.

**Progress 2026-07-29**
1. ✅ **Code-tabs component** ([components/common/codeTabs.ts](../components/common/codeTabs.ts), commit `7caee01`). Authors write plain Markdown: a `<div class="code-tabs" data-tabs="JavaScript,.NET">` wrapper with one fenced block per label. A client enhancer (run from `DynamicArticleDetails` after highlighting) builds a real tablist — full a11y roles/arrow keys, language choice syncs across every group on the page and persists in `localStorage`, malformed groups fall back to stacked snippets. Verified with 16 behavioural assertions under jsdom (structure, a11y, sync, persistence, keyboard, idempotency, fallback).
2. ✅ **Canonical article authored** — "Getting Started" (**1598**) merges the JS (1277) and .NET (1405) intros into one tabbed guide: install, OAuth, PAT, client setup, Options/region tables, method-group map, and a **feature-gap table** (what the .NET SDK still lacks vs. JavaScript). New sections created: **Introduction 1596**, **Instance 1597**.
3. ✅ **Fixed a broken page module** — dynamic page **54**'s `DynamicArticleDetails` had `item.contentId: null`, so *every* article under the section rendered an empty body (including the already-published 1402). Repaired via `save_page` (now item **1600**); no duplicate module was appended.

🔴 **BLOCKED — hyphenated container reference names break the sidebar (needs a decision).**
`ManagementSDK-Articles` / `ManagementSDK-Sections` contain a hyphen, and [SidebarNav.tsx](../components/agility-pageModules/SidebarNav.tsx) interpolates the reference name straight into a GraphQL query (`${articlesRefName} (take: 250) {…}`). Hyphens are illegal in GraphQL field names, so the query throws and the whole section hits the error boundary ("This page couldn't load"). Every other category works only because its name is alphanumeric (the read API lowercases it, e.g. `sveltekitarticles`).

Worse, it isn't only a syntax problem — probing the API shows the data isn't reachable over GraphQL at all:

| Container | REST (`/list/…`) | GraphQL |
|---|---|---|
| `ManagementSDK-Articles` | ✅ 2 published items | ❌ `managementsdk_articles` → **0 items** |
| `SvelteKitArticles` | ✅ | ✅ `sveltekitarticles` → 10 items |

So a code-side fix (sanitising the field name to `managementsdk_articles`) makes the query *valid* but still returns nothing — the sidebar would render empty. **Recommended fix:** create fresh hyphen-free containers (`ManagementSDKArticles` / `ManagementSDKSections`), move the 3 items across, and repoint DocCategory **1258** + dynamic page **54**. Preferred over renaming the existing containers (avoids whatever indexing state is wrong) and over rewriting SidebarNav to use REST (which would touch every category). **Also worth fixing regardless:** make `SidebarNav` sanitise/alias the GraphQL field name so a hyphenated container degrades to an empty sidebar instead of a crashed page.

ℹ️ Related: DocCategory 1258's `LandingPage.href` is `/management-sdk` but the page tree actually sits at `/javascript/management-sdk` (pages 53 → 54). Cosmetic today (the sidebar derives hrefs from the sitemap node, not this field), but the original author clearly intended a **top-level** `/management-sdk` — worth moving page 53 to the root while the section is being fixed, since a language-neutral SDK doesn't belong under `/javascript`.

### Phase 4 — Flagship refresh *(weeks, ongoing)*
- **Next.js** (25 articles, mostly 2021–22):
  - ✅ **Core guides aligned to App Router + Cache Components (2026-07-29, staged)** — grounded in the real code across the 2026 site + this docs repo. Rewritten & converted EditorJS→Markdown: **#985 "Caching with Next.js and Agility"** (full Cache Components model: `'use cache'`/`cacheTag`/`cacheLife`, `revalidateTag(tag,"max")`, tag-contract table), **#744 "Rendering & Data Fetching with Next.js"** (was Pages-Router `getServerSideProps` — now RSC, static-vs-dynamic, `generateStaticParams`, `connection()`, PPR/streaming), **#488 "Next.js and Agility CMS"** (modernized intro), **#480 "How the Next.js Starter Works"** (caching/preview/ISR sections corrected off the old SDK caching API; tag contract + `draftMode()` preview). All four cross-linked; verified rendering in dark mode. ✅ **Published 2026-07-29.**
  - ⏳ **Prune assessment (2026-07-29) — decisions recorded, unpublishing deferred to rollout:**
    - **Retire:** AWS EC2 (#536) + AWS Amplify (#537) — Pages-Router-era, niche self-hosting; merge into one short "self-hosting" note or drop (Vercel/Azure/Netlify cover the common cases). Commerce Starter (#482/#483) — Next.js Commerce is effectively deprecated by Vercel. Google Optimize (#627) — already Unpublished; sunset product → delete/archive formally.
    - **Keep, verify App-Router accuracy:** Deploy to Vercel (#534), Netlify (#535), Azure (#608).
    - **Low-priority:** Storybook (#626) — tooling still valid but the guide is 2021; refresh or retire.
- **Angular** — ⏳ **the real version drift.** #1090 is titled "Angular 18 SSR Starter"; current stable is Angular 22. The other four articles (597/598/599/600) are 2021 and predate the SSR starter. Needs a refresh against the **current Agility Angular starter** — which is **not checked out locally** (only the Next.js repos are). Gate this on having the Angular starter repo so version-specific steps are accurate rather than guessed.
- **Astro** — ℹ️ **audit flagged on 2024 vintage, but the content holds up** (inspected 2026-07-29): the bodies are version-neutral and the patterns are still correct for current Astro (SSR + `[...slug].astro` + `lib/agility-cms/getPage.ts` + `Cache-Control: s-maxage/stale-while-revalidate`; Astro has no Cache-Components equivalent). No urgent version fix. Optional polish: modernize terminology ("Page Modules" → "Components"), and expand depth (only 4 articles: content-fetch, components, deployment).
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

## 8. Findings from execution (2026-07-28)

**🔴 Production was serving `noindex` on every doc article.** Found while wiring Phase 0's archive `noindex`. `resolveAgilityMetaData` treated `dynamicPageItem.seo.sitemapVisible === false` as a robots directive, but that flag is **`false` by default on every `DocArticle`** — it concerns sitemap/menu placement of dynamic items, not indexing. Net effect: `sitemap.xml` advertised ~306 URLs while each article told Google not to index it. Regression from the App Router migration (`7839777`, 2026-07-16); **fixed** — articles are indexable again, and only registry-archived paths are `noindex`. This undercut the whole SEO/AI-discoverability effort (sitemap, IndexNow, llms.txt), so it likely outweighs any single content task here. *Worth requesting re-crawl in Search Console once the rebuild ships.*

**🟢 The Agility MCP can publish after all.** `publish_content`, `unpublish_content`, `manage_content_workflow`, `publish_page`/`unpublish_page`, and `delete_content_item` all exist. AGENTS.md and the authoring skill both claimed otherwise — corrected. `save_content_items` still always writes to **Staging** (`state` is ignored). Publishing is outward-facing: confirm with a human first.

## 9. Decision log

| Date | Decision |
|---|---|
| 2026-07-28 | Dead frameworks → **archive + `noindex` + drop from nav**, keep URLs alive (Gatsby first). |
| 2026-07-28 | SvelteKit → **drop from nav now**; finish the 8 empty/stub articles, then publish + re-add. |
| 2026-07-28 | Blazor → **lives in .NET docs** but **gets its own framework-nav entry**. |
| 2026-07-28 | Management SDK → **consolidate into one section with per-language tabs**; add to nav. |
| 2026-07-28 | Nuxt / Eleventy → **watch-list**; refresh-or-archive gated on usage data (see §7). |
| 2026-07-28 | Docs site **instrumented**: PostHog (pageviews + search events) and Algolia Insights (click analytics). PostHog key still to be set in prod. |
| 2026-07-29 | **Next.js core docs modernized** (Phase 4, staged): #985 caching, #744 rendering, #488 intro, #480 starter-works all aligned to App Router + Cache Components, grounded in the 2026-site/docs-repo code and cross-linked. |
| 2026-07-29 | **Dated Next.js guides — prune calls recorded** (Phase 4): retire AWS EC2/Amplify + Commerce Starter, delete already-unpublished Google Optimize, keep+verify Vercel/Netlify/Azure, low-pri Storybook. Actual unpublishing deferred to rollout. |
| 2026-07-29 | **Bulk publish executed** (user-approved): all staged framework articles + header nav items went live — Next.js core rewrites (985/744/488/480), .NET (281 + Mgmt-SDK 1405–1411), JavaScript (290/1277), all 10 SvelteKit + sections + DocCategory 1177 + pages 44/46, ManagementSDK 1402 (+5 sections), 17 header links incl. Blazor 1595, Angular hero 196. **Deliberately skipped:** ManagementSDK stub 1251 (32-char body). **Left staged:** the ocean-redesign pages (2/3/4/5/58/59/60/61) and their reskin content. Verified on the rebuild deployment; legacy prod (Pages-Router, Netlify+Vercel stale caches) heals on its own ISR cadence and is superseded by the rebuild anyway. |
| 2026-07-29 | **SvelteKit Phase 2 authored (staged):** all 8 empty/stub articles written from a fresh clone of the sveltekit-starter (Routing & Sitemaps, Pages, Components, Content Lists, 4 deploy guides incl. the build-hook-on-publish + `$env/static/private` build-time gotchas); 1202's "Test" description fixed. Verified on local dev **and** the deployed branch preview. Rollout = publish all 10 + un-hide SvelteKit in `legacyFrameworks.ts` + published nav link. |
| 2026-07-29 | **Version-drift audit refined on inspection.** The 2026-07-29 audit flagged .NET/Astro on *vintage*, but the bodies hold up: **.NET #281** was already current (only its Description said ".NET 7" — fixed, staged); **Astro** articles are version-neutral and their patterns still valid (no urgent fix). **Angular is the real drift** (#1090 "Angular 18" vs current 22 + four 2021 pre-SSR articles) — deferred: needs the current Angular starter repo checked out for accurate version-specific steps. |
