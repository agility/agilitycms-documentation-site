# Agents

This document is the source of truth for AI agents working with this codebase. It reflects the **App Router architecture** (migrated July 2026) and the **ocean redesign** in progress on the `rebuild/ocean` branch.

## Project Overview

Source code for the [Agility CMS Documentation Site](https://agilitycms.com/docs) — the official knowledgebase for Agility CMS. All documentation content lives in Agility CMS (instance `67bc73e6-u`); this Next.js app renders it. The site is served under `agilitycms.com/docs` via a Netlify proxy in front of Vercel (see [HOSTING.md](HOSTING.md)) with `basePath: '/docs'`.

## Web Stack

- **Next.js 16.2 (App Router, Turbopack)** with **Cache Components** (`cacheComponents: true` in [next.config.js](next.config.js)) — the `'use cache'` + `cacheTag`/`cacheLife` model with Partial Prerendering. There is **no `pages/` directory**.
- **React 19**, **Tailwind CSS v4** (CSS-first config in [styles/globals.css](styles/globals.css)), **TypeScript** for all new code (legacy `.js` components remain until rewritten).
- **Ocean design tokens** in [styles/tokens.css](styles/tokens.css) (light + dark theme blocks, source of truth: `docs/plan-handoff.md` §3). Components must use semantic tokens (`--primary`, `--surface`, `--text`…), never hardcoded hex. Dark mode = `data-theme` on `<html>`, three-state control in [components/common/ThemeControl.js](components/common/ThemeControl.js).
- **Fonts**: Mulish / Inder (400 only) / Fira Mono via `next/font` in [app/layout.tsx](app/layout.tsx). The CSS variables sit on the `<main>` wrapper because tokens.css resolves its font aliases at the `main` selector (custom properties resolve `var()` refs at the declaring node).
- **Search**: Algolia, index `doc_site`. **MCP server**: `/docs/api/mcp` ([app/api/mcp/README.md](app/api/mcp/README.md)).
- Package manager: **npm** (package-lock.json; `.npmrc` sets `legacy-peer-deps` — the tree has peer conflicts strict `npm ci` would reject). Lint: ESLint 9 flat config ([eslint.config.mjs](eslint.config.mjs)), `npm run lint`.

## Routing

```
app/
  layout.tsx                     # html shell, theme bootstrap script, fonts
  [locale]/
    layout.tsx                   # site chrome: Header (fetches its own data)
    page.tsx                     # home = re-export of the catch-all
    [...slug]/page.tsx           # THE page route: generateStaticParams + generateMetadata + render
    [...slug]/not-found.tsx      # 404 (ocean-styled)
  api/…                          # route handlers (see below)
  sitemap.xml/route.ts           # sitemap.xml (all locales)
  llms.txt/route.ts              # AI-agent index of the docs (T7), from the cached sitemap
proxy.ts                         # Next 16 proxy (renamed middleware)
```

**Locale routing** (pattern from demosite2025): locales come from `AGILITY_LOCALES` (comma-separated, e.g. `en-us,fr-ca`). The **first is the default and serves unprefixed URLs** — [proxy.ts](proxy.ts) rewrites `/overview` → internal `/en-us/overview`. Non-default locales are prefixed (`/fr-ca/overview`). Adding a language = adding it to `AGILITY_LOCALES` (plus content in Agility). Helper: `localizeUrl(path, locale)` in [lib/i18n/config.ts](lib/i18n/config.ts) for building locale-aware hrefs.

**proxy.ts order of operations** (handle with care — verified against `next start`):
1. `?agilitypreviewkey=` → redirect to `/api/preview` (enter draft mode)
2. `?AgilityPreview=0` → redirect to `/api/preview/exit`
3. `?ContentID=n` → rewrite to `/api/dynamic-redirect` (CMS deep links)
4. `/{article-path}.md` → rewrite to `/api/article-md/{article-path}` (clean markdown, T7). The path travels **in the URL path, not a query param** — query strings added during a middleware rewrite don't reliably survive under basePath.
5. No locale prefix + not static/api → **rewrite** to `/{defaultLocale}{path}`

> ⚠️ **Matcher gotcha:** the negative-lookahead matcher pattern does **not** match the bare basePath root `/` — it must be listed explicitly (`matcher: ["/", "/((?!api|_next/…).*)"]`) or the home page silently skips the locale rewrite and 404s. `request.nextUrl.pathname` excludes the `/docs` basePath; rewrites built by cloning `nextUrl` keep the basePath automatically.

> ⚠️ **Route-handler redirect gotcha:** the "basePath comes back automatically" rule above holds **only in middleware**. In a route handler (`app/api/*/route.ts`), a redirect built from `request.nextUrl.clone()` does **not** re-add the basePath — the preview enter/exit and ContentID redirects must prepend `nextConfig.basePath` themselves or they land outside `/docs` and 404.

## Data Layer (`lib/cms/`)

All Agility reads go through cached primitives. Each takes explicit `{ locale, preview }`; **published requests are cached** under `'use cache'` + `cacheTag` + `cacheLife("days")`, **preview requests bypass the cache** entirely.

| Module | Purpose | Cache tag |
|---|---|---|
| `getAgilityPage.ts` | sitemap→node→page→dynamicItem composition (replaces `getAgilityPageProps` — its fetch options predate Cache Components) | composes the tags below |
| `getSitemapFlat.ts` | flat sitemap | `agility-sitemap-flat-{locale}` |
| `getContentItem.ts` | single item | `agility-content-{contentID}-{locale}` |
| `getContentList.ts` | container list | `agility-content-{refname.toLowerCase()}-{locale}` |
| (page fetch inside getAgilityPage) | page by ID | `agility-page-{pageID}-{locale}` |
| `gql.ts` | Agility GraphQL API (fetch-based; Apollo is gone from the render path) | `agility-graphql-{locale}` (coarse) |
| `getAgilitySDK.ts` | SDK factory; `getAgilitySDK_NonReact({isPreview})` for non-request contexts | — |
| `getAgilityContext.ts` | `{locale, isPreview, isDevelopmentMode}` from draftMode + env | — |
| `isDevMode.ts` | dev detection; `FORCE_PUBLISHED=1` makes local dev behave like production | — |

`lib/cms-content/` has the composed helpers: `getHeaderData` (sitemap nav + `header` container), `getFooterData` (the docs instance's single `Footer` item: tagline + three nested link columns + legal links; returns null → component fallback when unpublished), `getRichSnippet` (JSON-LD: WebSite / TechArticle / BreadcrumbList, emitted as an in-body `<script type="application/ld+json">`), `resolveAgilityMetaData` (generateMetadata: title precedence = dynamic item metaTitle → sitemap title; canonical `https://agilitycms.com/docs{path}`; Cloudinary OG image; extracts `<meta>` pairs from the CMS metaHTML field).

## Caching & Instant Invalidation

Long TTLs (`cacheLife("days")`) + **instant invalidation via the publish webhook** — the model the Next docs recommend for CMSs.

**Webhook**: `POST /docs/api/revalidate` ([app/api/revalidate/route.ts](app/api/revalidate/route.ts)). Configure in Agility Settings → Webhooks for publish/unpublish events. It maps the payload to `revalidateTag(tag, "max")` + `revalidatePath`:
- content item → item tag + container list tag + coarse GraphQL tag (+ path + sitemap tags on publish)
- page → page tag + sitemap tags + path
- no contentID/pageID (redirect change) → `BUILD_HOOK_URL` full rebuild if configured

The tag strings in the webhook **must stay in lockstep with lib/cms** — they are the contract. The edge layer adds `CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=86400` on pages (RFC 9213; honored by both Netlify and Vercel — see HOSTING.md), so full propagation is ≤60s edge TTL after the webhook fires.

## Preview / Draft Mode

- **Local dev serves staging (preview) content** (`isDevMode()`), so editors' unpublished work is visible at `npm run dev`. `FORCE_PUBLISHED=1 npm run dev` tests the published experience.
- Production preview = Next `draftMode()` cookie, entered through `?agilitypreviewkey=` → proxy → `/api/preview` (validates via `validatePreview`), exited via `/api/preview/exit`. `draftMode()` is prerender-safe: it reads disabled during static generation.
- The floating **PreviewBar** ([components/common/PreviewBar.js](components/common/PreviewBar.js), main-site design) shows in preview/dev; Ctrl/Cmd+Q toggles it anywhere. "Edit in CMS" deep-links via `NEXT_PUBLIC_AGILITY_GUID`.

## Rendering Model

The catch-all page fetches `getAgilityPage`, resolves the **page template** by name ([components/agility-pageTemplates/index.js](components/agility-pageTemplates/index.js): MainTemplate / WithSidebarNavTemplate / FullwidthTemplate), which renders `<ContentZone getModule={getModule}>` over `page.zones`. Modules are registered in [components/agility-pageModules/index.js](components/agility-pageModules/index.js).

**Modules are async server components that fetch their own data** (the Pages-Router `getCustomInitialProps` pattern is dead). A module receives `{ module, languageCode, isPreview, sitemapNode, dynamicPageItem, page }` from ContentZone; child lists are fetched via `getContentList` using `module.fields.<field>.referencename` (the page is fetched with `expandAllContentLinks: false`, so linked lists arrive as `{referencename}`). Interactive UI is split into client components: `SideBarNav` (server data) → `SideBarNavClient`; `Changelog` → `ChangelogClient`; `DynamicArticleDetails` and `CodeBlock` are `"use client"`.

**Chrome** (redesigned 2026-07-18, Stripe/Vercel docs pattern — same brand tokens as marketing, leaner functional chrome): `app/[locale]/layout.tsx` renders `Header` (client; one 60px sticky blurred row per the mockup `.topbar`: logo, section nav from the sitemap, APIs & SDKs dropdown from the `header` container, compact search, theme control, Sign in / Try Free). Templates render `<Footer languageCode isPreview/>` — a lean docs footer whose content lives in the **docs instance's `Footer` container** (single item 699, model 35: tagline, three named columns of nested `Link` items in `Footer_Link`/`FooterLink2`/`FooterLink3`, and legal links), with hard-coded fallbacks in the component for when the item isn't published. There is **no cross-instance dependency**: the marketing preheader banner and marketing footer were dropped with the redesign, so the new marketing instance launch does not affect docs chrome.

**UI primitives**: shadcn-style Radix components in [components/ui/](components/ui/) (`dropdown-menu`, `sheet`, `dialog`) styled with ocean tokens + `tw-animate-css`; `cn()` in [lib/utils.ts](lib/utils.ts). `@headlessui/react` is fully removed — build new interactive UI on these primitives.

## Content Model (instance `67bc73e6-u`)

### Doc articles (the core content — UNTOUCHED by the redesign, hard constraint)

`DocArticle` fields: `title`, `content` (EditorJS JSON), `markdownContent` (Markdown alternative), `description`, `section` (linked `DocSection`), `concept`. **Categories map to *pairs* of containers** — there is no single Articles container. Each top-level category (Overview, Developer, Editor, Owners & Admins, Apps, Training Guide, and each SDK/framework) has its own `*Articles` (model `DocArticle`) + `*Sections` (model `DocSection`) containers, e.g. `DeveloperArticles` + `DeveloperSections`. An article's category = which container it lives in; sidebar placement = its `section_ValueField` (contentID of a `DocSection`), matched in `SideBarNav`. Articles become pages through **dynamic pages** in the sitemap (node `contentID` > 0 → `dynamicPageItem`).

`DynamicArticleDetails` renders `markdownContent` through unified/remark/rehype **only when `content` has no EditorJS blocks**. Markdown: leading `# H1` stripped and used as title; GFM + raw HTML (incl. executed `<script>`) enabled; indented code blocks disabled (use fences).

### Ocean redesign models (added 2026-07, all additive)

Content models: `FeatureCard` (id 44: Heading, Body, LinkText, LinkURL, Icon, Accent primary/secondary/tertiary, Badge), `LinkCard` (45: Heading, Body, LinkURL, Category). Component models: `PageHero` (46), `MediaHero` (47), `FeatureCardGroup` (48, nested Cards→FeatureCard), `ArticleListSection` (49, nested Items→LinkCard), `CodeBlock` (50), `CalloutBlock` (51, Style note/control/caution), `ThemeAwareImage` (52). React components in [components/agility-pageModules/ocean/](components/agility-pageModules/ocean/).

Nested-list containers so far: `HomeFeatureCardGroup-Cards`, `HomeRoleLinkCards`, `WebStudioPageLinks`, `PageManagementPageLinks`, `AIPageLinks`, and (T5, 2026-07-17) `Overview-WhatMakesAgilityDifBCF555`, `Editors-LeadFeatureCards`, `Editors-AIAuthoringLinks`, `Developers-LeadFeatureCards`, `DevelopersAIMCPLinks`. Redesigned pages (staging only until the redesign ships): home hub (pageID 2), `/web-studio` (59), `/page-management` (60), `/ai` (61), the section landings `/overview` (5), `/editors` (4), `/developers` (3), and test page `ocean-test` (58). **Do not publish these pages until the redesign branch is deployed** — production code must know the ocean components first.

### Other containers

`header` (site header config + dropdowns), `changelog` + `changelogtags`, `doccategories` (category cards + article joins for search indexing).

## Search Indexing

Algolia index `doc_site`; searchable: `title`, `headings`, `body`, `description`. Route handlers (still Apollo-based — the only remaining Apollo usage, isolated from the render path):
- `POST/GET /docs/api/search/indexAllArticles` — atomic full rebuild (`replaceAllObjects`)
- `POST /docs/api/search/indexArticle` — single article, wired to an Agility webhook; deletes on unpublish

Normalization in [utils/searchUtils.js](utils/searchUtils.js) (EditorJS + Markdown).

## API Routes (all under `/docs/api/…`)

`revalidate` (webhook) · `preview` + `preview/exit` (draft mode) · `dynamic-redirect` (ContentID deep links) · `generatePreviewKey` · `mcp` (knowledgebase MCP server: `search_docs`, `fetch_doc`) · `article-md/[...slug]` (clean markdown per article — reached via the proxy `.md` rewrite; serializer in [lib/cms-content/articleMarkdown.ts](lib/cms-content/articleMarkdown.ts), shared candidate for the MCP `fetch_doc`) · `search/*` (Algolia; GraphQL reads go through `gqlFresh` — uncached) · `robots` (crawling allowed only behind the Netlify proxy — `cdn-loop` header check).

**Machine readability (T7)**: `/docs/llms.txt` indexes flagship pages, section landings, and every article (as `.md` links) from the cached published sitemap — flagship entries appear automatically once those pages publish. Any article URL + `.md` returns clean markdown (`markdownContent` served nearly verbatim; EditorJS blocks converted).

## Environment Variables

| Variable | Purpose |
|---|---|
| `AGILITY_GUID` / `AGILITY_API_FETCH_KEY` / `AGILITY_API_PREVIEW_KEY` | Docs instance + keys |
| `AGILITY_LOCALES` | Comma-separated; **first = default (unprefixed URLs)**. Currently `en-us` |
| `AGILITY_SITEMAP` | Channel name (default `website`) |
| `AGILITY_SECURITY_KEY` | Preview key validation |
| `NEXT_PUBLIC_AGILITY_GUID` | PreviewBar edit links |
| `AGILITY_FETCH_CACHE_DURATION` / `AGILITY_PATH_REVALIDATE_DURATION` | Cache TTL backstops ([lib/cms/cacheConfig.ts](lib/cms/cacheConfig.ts)) |
| `BUILD_HOOK_URL` | Full-rebuild hook for redirect-only changes |
| `FORCE_PUBLISHED` | `1` = dev behaves like production (published content) |
| `ALGOLIA_APP_ID` / `ALGOLIA_ADMIN_API_KEY` / `NEXT_PUBLIC_ALGOLIA_APP_ID` / `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | Search |
| `AZURE_APP_INSIGHTS_CONNECTION_STRING` | MCP telemetry (never initialized during build — see gotchas) |
| `ROBOTS_NO_INDEX` | Force noindex meta |

## Running Locally

```bash
yarn install
yarn dev            # http://localhost:3000/docs — serves STAGING content
FORCE_PUBLISHED=1 yarn dev   # published content (what production serves)
yarn build && yarn start -p 3006   # production build (prerenders ~300 pages)
```

## Gotchas & Conventions (read before editing CMS-driven code or content)

- **Lists cap at 250 / default 50.** Agility REST + GraphQL list calls default to 50 items and max out at 250 per request. Always pass explicit `take` (and paginate with `skip` if a category could exceed 250). This has silently dropped sidebar articles before.
- **Reference names are case-sensitive on write, lowercased on read.** Saving a "User Selectable" linked-content field requires the container's exact case (`DeveloperSections`); reads lowercase everything so you can't detect a mismatch by reading back — verify in the editor.
- **Cache Components is strict about non-determinism.** During prerender, `Math.random()`/`Date.now()` outside a `'use cache'` scope aborts the build (`next-prerender-random`). Known landmines already handled: `applicationinsights` (OpenTelemetry's RandomIdGenerator) must never initialize during `next build` — guarded in [lib/telemetry.ts](lib/telemetry.ts); the Algolia client is created lazily in [components/common/Search.js](components/common/Search.js) (host-shuffle uses Math.random). If a build fails with `next-prerender-random`, bisect with `FORCE_PUBLISHED=1 npx next build --debug-prerender`.
- **`export const revalidate` is not allowed** with Cache Components — lifetimes live in `cacheLife()` inside cached scopes.
- **generateStaticParams must return ≥1 result** under Cache Components (no dev-mode empty shortcut).
- **proxy.ts matcher must include bare `/`** (see Routing above).
- **New cache tags must be added in two places**: the lib/cms getter AND the `/api/revalidate` webhook.
- **Publishing redesigned pages before deploying the redesign branch breaks production** — the live bundle won't know the ocean components.
- **Authoring docs content via the Agility MCP**: follow the skill at [.claude/skills/authoring-agility-docs/SKILL.md](.claude/skills/authoring-agility-docs/SKILL.md) — full category→container map, case rules, image-upload workflow, preview/edit link templates. The MCP **cannot** set workflow state, publish, or delete (human actions in the Agility UI). Known Agility MCP server bugs (phantom `save_page_model`, module reordering is a no-op, dropdown choice mangling, instant-expiring upload tokens) are logged in [docs/rebuild-plan-2026.md](docs/rebuild-plan-2026.md) §4.
- **The redesign plan** lives in [docs/rebuild-plan-2026.md](docs/rebuild-plan-2026.md) (phases, open decisions); design handoff in `docs/plan-handoff.md`; hosting portability rules in [HOSTING.md](HOSTING.md).
