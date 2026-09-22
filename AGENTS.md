# Agents

This document is the source of truth for AI agents working with this codebase. It reflects the **App Router architecture** (migrated July 2026) and the **ocean redesign** in progress on the `rebuild/ocean` branch.

## Project Overview

Source code for the [Agility CMS Documentation Site](https://agilitycms.com/docs) — the official knowledgebase for Agility CMS. All documentation content lives in Agility CMS (instance `67bc73e6-u`); this Next.js app renders it. The site is served under `agilitycms.com/docs` via a Netlify proxy in front of Vercel (see [HOSTING.md](HOSTING.md)) with `basePath: '/docs'`.

## Web Stack

- **Next.js 16.2 (App Router, Turbopack)** with **Cache Components** (`cacheComponents: true` in [next.config.js](next.config.js)) — the `'use cache'` + `cacheTag`/`cacheLife` model with Partial Prerendering. There is **no `pages/` directory**.
- **React 19**, **Tailwind CSS v4** (CSS-first config in [styles/globals.css](styles/globals.css)), **TypeScript** for all new code (legacy `.js` components remain until rewritten).
- **Ocean design tokens** in [styles/tokens.css](styles/tokens.css) (light + dark theme blocks). Neutrals, radius and type come from `docs/plan-handoff.md` §3; the brand teal/blue/yellow come from the 2026 brand palette — see [docs/brand-palette-2026.md](docs/brand-palette-2026.md), which the marketing site shares. Components must use semantic tokens (`--primary`, `--surface`, `--text`…), never hardcoded hex. **On dark the teal splits in two**: `--primary` is the fill/graphic teal and `--primary-text` is the type/icon teal — `--primary` on body-size copy fails AA. Blue (`--secondary`) is never a text colour on dark; use `--secondary-bright`. A label on a `--primary` fill takes `--on-primary` (it flips near-black/white by theme), not `--on-color`. Dark mode = the **`dark` class plus `style.colorScheme`** on `<html>` (there is no `data-theme` attribute), applied pre-paint by the no-flash script in [app/layout.tsx](app/layout.tsx) and after hydration by the three-state control in [components/common/ThemeControl.tsx](components/common/ThemeControl.tsx). Both must be set: the class drives the CSS, and `color-scheme` drives form controls, scrollbars and **the theme inside `<img>`-embedded SVGs** (see the diagram convention in Gotchas). The choice persists under `aglty-theme` — the same localStorage key the marketing site reads, so the preference carries across the `agilitycms.com` ↔ `agilitycms.com/docs` boundary.
- **Fonts**: **Mulish** (variable, 400–800 — body *and* headings) and **Fira Code** (code, mono labels) via `next/font` in [app/layout.tsx](app/layout.tsx). The next/font variables sit on **`<html>`**; tokens.css resolves the `--font` / `--serif` / `--mono` aliases at `:root` and applies `font-family` on `body`. **Keep them at the document root.** They lived on the `<main>` wrapper until 2026-09-18, which silently broke every article: under Cache Components the page body streams in *after* `</main>` closes, so it sat outside `<main>` in the DOM and inherited neither the aliases nor the font — article text fell back to the system stack and inline code to Menlo, in production, while the nav stayed Mulish. A `var()` reference resolves at its **declaring** node, which is the whole trap.
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
    api-reference/…              # GENERATED API reference (not CMS-backed) —
                                 #   /[api] and /[api]/[operation] built from the
                                 #   OpenAPI snapshots in lib/api-specs/snapshots
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
5. Path not published and not app-owned → **a real 404, answered by the proxy itself** (see the 404 gotcha below)
6. No locale prefix + not static/api → **rewrite** to `/{defaultLocale}{path}`

> ⚠️ **Matcher gotchas (two of them):** the negative-lookahead pattern does **not** match the bare basePath root `/` — it must be listed explicitly (`matcher: ["/", "/((?!api/|_next/…).*)"]`) or the home page silently skips the locale rewrite and 404s. And each **directory** exclusion needs a **trailing slash**: the lookahead is an unanchored prefix test, so a bare `api` excludes every path merely *starting* with those letters. `/api-reference` hit exactly that — it never reached the proxy, skipped the locale rewrite, and served a 404 shell despite prerendering fine. (Latent, not a past regression: no published path starts with `api`/`assets`.) `favicon\.ico`, `sitemap\.xml` and `robots\.txt` are exact filenames and must NOT get a slash. Note `isApi` in the proxy body correctly uses `/api/`, so body and matcher can silently disagree. `request.nextUrl.pathname` excludes the `/docs` basePath; rewrites built by cloning `nextUrl` keep the basePath automatically.

> ⚠️ **404s are decided in the proxy, not by `notFound()`.** Every page route is partially prerendered (`cacheComponents`), so the static shell — and with it a `200` status line — is on the wire before a page can call `notFound()`. Next's docs are explicit: not-found returns *"200 for streamed responses, 404 for non-streamed"*, and the status *"cannot be updated"* once headers are sent. That is why unknown URLs used to answer **200 with the not-found UI** (a soft 404). `dynamicParams = false` is not an escape — it is unavailable under Cache Components, and it would hard-404 every page published since the last deploy, because `/api/revalidate` busts tags and never rebuilds. So [proxy.ts](proxy.ts) validates each path against the published flat sitemap and **answers the 404 itself** with `new NextResponse(html, { status: 404 })`, memoising the sitemap in module scope and failing **open** if Agility is unreachable.
>
> A **rewrite cannot** set that status. Verified on a Vercel preview: rewriting to the prerendered not-found page serves the correct HTML with a **200**, because Vercel does not adopt the destination's status (Next's `resolve-routes.js` only propagates a status on the redirect branch). Rewriting *outside* the basePath is worse — Vercel never reaches the app and returns its own 79-byte plain-text platform 404. Under `next start` both behave differently again, so **local results are not evidence for the platform here**.
>
> ⚠️ **Adding a hand-written route under `app/`? It must pass `isAppPath` in [proxy.ts](proxy.ts)** — otherwise it 404s in production while working perfectly in `next dev`, because the check is skipped in dev and draft mode. Anything under `/api/*` is exempt. Two sources feed it:
>
> - `APP_PATHS`, the hand-listed set: `/`, `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/404`, `/500`.
> - `apiReferencePaths()`, ~128 paths computed from the checked-in OpenAPI snapshots, because the generated reference is far too large and too churn-prone to hand-list. It **must** come from the same snapshots the pages are built from — see the `dynamicParams` gotcha for what a disagreement between the two costs.

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

`lib/cms-content/` has the composed helpers: `getHeaderData` (sitemap nav + `header` container), `getFooterData` (the docs instance's single `Footer` item: tagline + three nested link columns + legal links; returns null → component fallback when unpublished), `getRichSnippet` (JSON-LD: ONE `@graph` per page — Organization + WebSite + WebPage, plus BreadcrumbList / TechArticle / VideoObject as they apply — emitted as an in-body `<script type="application/ld+json">`. Shared entity nodes live in [lib/seo/schema.ts](lib/seo/schema.ts) and are referenced by stable `@id` rather than inlined per page; breadcrumb names come from the sitemap, never the slug), `resolveAgilityMetaData` (generateMetadata: title precedence = dynamic item metaTitle → sitemap title; canonical `https://agilitycms.com/docs{path}`; Cloudinary OG image; extracts `<meta>` pairs from the CMS metaHTML field).

## Caching & Instant Invalidation

Long TTLs (`cacheLife("days")`) + **instant invalidation via the publish webhook** — the model the Next docs recommend for CMSs.

**Webhook**: `POST /docs/api/revalidate` ([app/api/revalidate/route.ts](app/api/revalidate/route.ts)). Configure in Agility Settings → Webhooks for publish/unpublish events. It maps the payload to `revalidateTag(tag, "max")` + `revalidatePath`:
- content item → item tag + container list tag + coarse GraphQL tag (+ path + sitemap tags on publish)
- page → page tag + sitemap tags + path
- no contentID/pageID (redirect change) → `BUILD_HOOK_URL` full rebuild if configured

The tag strings in the webhook **must stay in lockstep with lib/cms** — they are the contract. The webhook also purges the fronting Netlify CDN by cache tag ([lib/netlify/purgeNetlifyCache.ts](lib/netlify/purgeNetlifyCache.ts)): `revalidateTag` only reaches Vercel, and agilitycms.com/docs is a Netlify proxy rewrite that has no idea a publish happened.

Edge cache headers are set in [proxy.ts](proxy.ts), **not** `next.config` — that rule was unconditional and would put `CDN-Cache-Control: public` on draft-mode renders. Pages get `CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=86400` (portable, what Vercel honours) plus `Netlify-CDN-Cache-Control` with a longer TTL, `Netlify-Vary` and `Netlify-Cache-Tag`. Full detail + a post-deploy runbook in [HOSTING.md](HOSTING.md).

## Preview / Draft Mode

- **Local dev serves staging (preview) content** (`isDevMode()`), so editors' unpublished work is visible at `npm run dev`. `FORCE_PUBLISHED=1 npm run dev` tests the published experience.
- Production preview = Next `draftMode()` cookie, entered through `?agilitypreviewkey=` → proxy → `/api/preview` (validates via `validatePreview`), exited via `/api/preview/exit`. `draftMode()` is prerender-safe: it reads disabled during static generation.
- The floating **PreviewBar** ([components/common/PreviewBar.js](components/common/PreviewBar.js), main-site design) shows in preview/dev; Ctrl/Cmd+Q toggles it anywhere. "Edit in CMS" deep-links via `NEXT_PUBLIC_AGILITY_GUID`.

### Web Studio (in-context editing)

Following demosite2025's pattern. Two halves that must stay in sync:
1. **The SDK** — [app/[locale]/layout.tsx](app/[locale]/layout.tsx) loads `@agility/web-studio-sdk` via `next/script` (`afterInteractive`) **only when `isPreview`** (draft mode or local dev), never on the public production site. The `frame-ancestors 'self' https://app.agilitycms.com` CSP in [next.config.js](next.config.js) lets Web Studio iframe the site.
2. **`data-agility-*` DOM tags** — the SDK maps DOM elements to CMS records through these: `data-agility-page`/`data-agility-dynamic-content` on the page wrapper ([app/[locale]/[...slug]/page.tsx](app/[locale]/[...slug]/page.tsx)); `data-agility-component={module.contentID}` on a module's outermost element; `data-agility-field="<fieldName>"` on the element rendering each editable field (exact CMS field name). Tagged: the article ([DynamicArticleDetails](components/agility-pageModules/DynamicArticleDetails.tsx): title/description/content|markdownContent), `HeroHeading`, the shared `SectionBand` (heading/intro — threaded from the 5 landing modules via `contentID`/`headingField`/`introField` props), and the ocean modules. Only a module's own fields are tagged, not nested-list child items (separate content records).

## Rendering Model

The catch-all page fetches `getAgilityPage`, resolves the **page template** by name ([components/agility-pageTemplates/index.js](components/agility-pageTemplates/index.js): MainTemplate / WithSidebarNavTemplate / FullwidthTemplate), which renders `<ContentZone getModule={getModule}>` over `page.zones`. Modules are registered in [components/agility-pageModules/index.js](components/agility-pageModules/index.js).

**Modules are async server components that fetch their own data** (the Pages-Router `getCustomInitialProps` pattern is dead). A module receives `{ module, languageCode, isPreview, sitemapNode, dynamicPageItem, page }` from ContentZone; child lists are fetched via `getContentList` using `module.fields.<field>.referencename` (the page is fetched with `expandAllContentLinks: false`, so linked lists arrive as `{referencename}`). Interactive UI is split into client components: `SideBarNav` (server data) → `SideBarNavClient`; `Changelog` → `ChangelogClient`; `DynamicArticleDetails` and `CodeBlock` are `"use client"`.

**Chrome** (redesigned 2026-07-18, Stripe/Vercel docs pattern — same brand tokens as marketing, leaner functional chrome): `app/[locale]/layout.tsx` renders `Header` (client; one 60px sticky blurred row per the mockup `.topbar`: logo, section nav from the sitemap, APIs & SDKs dropdown from the `header` container, compact search, theme control, Sign in / Try Free). Templates render `<Footer languageCode isPreview/>` — a lean docs footer whose content lives in the **docs instance's `Footer` container** (single item 699, model 35: tagline, three named columns of nested `Link` items in `Footer_Link`/`FooterLink2`/`FooterLink3`, and legal links), with hard-coded fallbacks in the component for when the item isn't published. Above the header sits the **marketing bar** ([components/common/MarketingBanner.tsx](components/common/MarketingBanner.tsx)) — a 36px strip that links back to agilitycms.com. It is the site's **one cross-instance dependency**, reintroduced deliberately in 2026-09 after the redesign had removed it (the marketing footer stayed gone). It is split on purpose: the *message* is read from the marketing instance (`MAIN_AGILITY_SITE_GUID`, [lib/cms/getMainSiteContent.ts](lib/cms/getMainSiteContent.ts)), while the *CTAs* come from the docs instance's own `header` item (`MarketingCta1`/`MarketingCta2`, model 26's Pre Header tab) so docs owns where it links back to — mirroring the marketing side's CTAs would import its "Docs" link, which points at the page you are already on. `ShowPreHeader` on the docs item switches the whole bar off; the marketing side's `HideMarketingBanner` only drops the message.

> **The message falls back to the docs header's own `FallbackMarketingMessage`** whenever the marketing instance supplies none — the normal state until the 2026 site launches, not an error. Every route to "no message" lands there: instance unconfigured or unreachable, nothing published, copy cleared, or their `HideMarketingBanner` on. So the bar never renders as an empty strip, and docs always has something to say.

> ⚠️ **That instance has no webhook into this app.** `/api/revalidate` is wired to the docs instance only, so a marketing publish does not bust the docs cache — the message is cached `hours`, not `days`, and the `main-site-header` tag exists only so that webhook *could* bust it later. Every failure path (unconfigured, unreachable, nothing published) returns null and the bar renders without a message; a marketing outage must never take the docs chrome with it.
>
> ⚠️ **Main-site hrefs must be absolutized** (`toMainSiteUrl`), including the ones inside the message HTML. The docs app runs under basePath `/docs`, so a stored `/demo-request` would resolve to `/docs/demo-request` — and on a preview domain it would not be the marketing site at all.

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

## API Reference (generated)

`/docs/api-reference` — 126 operation pages built from the **checked-in OpenAPI snapshots** in [lib/api-specs/snapshots/](lib/api-specs/snapshots/) (Fetch 11, Management 115), not from the live spec endpoints. The operation slugs are a public URL contract that appears in sitemap.xml and llms.txt, so they change by pull request: `npm run specs:refresh` updates the snapshots, `-- --check` reports drift for CI, and the [api-spec-drift skill](.claude/skills/api-spec-drift/SKILL.md) checks the prose against the specs.

- **Slugs are derived**, because neither spec carries a single `operationId` (0 of 130). Method + literal path segments; `/v1`-prefixed duplicates fold in as aliases; only templated-tail variants take a `-by-<param>` suffix. `buildOperations` throws on a collision rather than letting two operations share a URL — see the long comment in [lib/api-specs/operations.ts](lib/api-specs/operations.ts).
- **`proxy.ts` must agree with the pages on the valid path set** (`apiReferencePaths()`), for the `dynamicParams` reason in Gotchas. Same source, or the gap is a soft 404.
- **The explorer** ([components/api-reference/ApiExplorer.tsx](components/api-reference/ApiExplorer.tsx)) calls `api.aglty.io` **straight from the browser** — it answers `Access-Control-Allow-Origin: *` and allows the `APIKey` header — so no server proxy and no request-time IO on a docs route. Only the instance list and the key go through our server, because they need the visitor's Agility cookie.
- **Keys resolve the way the Manager app does it**, via Classic CM as the signed-in visitor ([lib/explorer/classicCall.ts](lib/explorer/classicCall.ts), a server-side port of the Manager app's `authenticatedCall`): `POST /json/Settings/SelectAllAPIKeys {websiteName, take, token}` → pick the enabled, unexpired `Type === "fetch"` entry → `POST /json/Settings/GetAPISecret {websiteName, type, name}` → the usable key is **`Name.secret`**. Instances (and their per-region `ManagerUrl`) come from `GetCurrentServerUser`'s `WebsiteAccess`, the same source `useWebsiteInfo` reads. Authorization is intrinsic — the call is made as the visitor and keyed by `websiteName`, so it simply fails for an instance they can't reach — and membership is re-checked first as defence in depth.
  - Only `Type === "fetch"`, **never `preview`**: they sit side by side in the same `Items` array and a preview key reads unpublished content. No parameter can talk the route into returning the other.
  - The key is held in component state only, never web storage: articles on this origin execute author-supplied `<script>`.
  - ⚠️ `GET mgmt.aglty.io/oauth/getfetchkey?guid=…` also returns a live fetch key and is **unauthenticated** (any guid, no token — verified 2026-09-20). This route deliberately does NOT use it; it says nothing about whether the caller is entitled to the key. `getpreviewkey` has an identical signature and was not tested.
- **The Management runner is server-proxied, and read-only.** Its "try it" posts to `/api/explorer/mgmt-request`; the Fetch runner calls the API direct from the browser. The difference is deliberate: a Management bearer token is **write-capable across every instance the user can reach**, and this origin executes author-supplied `<script>`, so the token is minted per request via `POST {managerUrl}/json/User/GetAccessToken` (the Manager app's own trick — no OAuth redirect needed) and never leaves the server.
  - **The client sends an operation SLUG, never a path.** The server looks the operation up in the spec and rebuilds the path from the spec's own template, forcing `{guid}` to the instance the caller was authorized for. Accepting a path string would make this an authenticated SSRF proxy into the Management API.
  - **The allowlist is [lib/explorer/runnable.ts](lib/explorer/runnable.ts) and is enforced server-side on every request**, not just when rendering: GET only (read-only in v1), `/api/v1/` only — which excludes every `/oauth/` path, and `getpreviewkey`/`getfetchkey` in particular — and no `/api/v1/tokens`. Verified refused: real DELETE/POST slugs, both key endpoints, tokens/list, an unauthorized guid, and a junk slug.
  - Operations without a `{guid}` (`/users/me`, `/types`) act on the caller, so they show no instance picker.
- **Sign-in returns the reader to where they were**: `{managerUrl}/login?returnUrl={encodeURIComponent(href)}` — the Manager app's own pattern (`LoginRequired.tsx`). **No Auth0 change is needed**: Classic's `/login` keeps the returnUrl in its OWIN `AuthenticationProperties` and hands Auth0 only its own registered callback (`https://manager.agilitycms.com/`), confirmed by both the 302 and `GlobalController.Login`, which sets `RedirectUri = returnUrl` unvalidated. The session then rides back on the `.agilitycms.com`-scoped cookie that /docs already reads.
- **Testing the signed-in flows locally**: the auth cookie is scoped to `.agilitycms.com`, so a browser never sends it to localhost. Put a real `AgilityAuthOWIN` value in `AGILITY_DEV_AUTH_COOKIE` (see `.env.local.template`) and it stands in for one. It is only honoured when the var is set **and** `VERCEL`/`CI` are unset **and** the request host is localhost; a real cookie always wins. ⚠️ **Adding it requires a `next build`** — a server-only `process.env` read that did not exist at build time comes back `undefined` under `next start` even with the value in `.env.local` (observed 2026-09-21: identical config failed before a rebuild and worked after). Two debugging cycles went into that; rebuild first.
- Regional hosts derive from the GUID suffix (`-u`/`-c`/`-e`/`-a`/`-us2`/`-d` → `api{-infix}.aglty.io` and `mgmt{-infix}.aglty.io`); all twelve verified 2026-09-20.

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
| `INDEXNOW_KEY` | IndexNow submission key. Served at `/docs/{key}.txt` ([proxy.ts](proxy.ts)) for ownership verification; the publish webhook pings IndexNow on content/page publish ([lib/indexnow/submitToIndexNow.ts](lib/indexnow/submitToIndexNow.ts)). Submits only from production — set `INDEXNOW_ALLOW_NON_PROD=true` to test elsewhere |
| `FORCE_PUBLISHED` | `1` = dev behaves like production (published content) |
| `ALGOLIA_APP_ID` / `ALGOLIA_ADMIN_API_KEY` / `NEXT_PUBLIC_ALGOLIA_APP_ID` / `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | Search |
| `AZURE_APP_INSIGHTS_CONNECTION_STRING` | MCP telemetry (never initialized during build — see gotchas) |
| `ROBOTS_NO_INDEX` | Force noindex meta |
| `NETLIFY_PURGE_TOKEN` | Netlify personal access token. Lets the publish webhook purge the apex CDN ([lib/netlify/purgeNetlifyCache.ts](lib/netlify/purgeNetlifyCache.ts)) — `revalidateTag` only reaches Vercel, and agilitycms.com/docs is a Netlify proxy rewrite. **Optional:** unset = purge no-ops and the apex self-heals on `s-maxage` instead |
| `NETLIFY_SITE_ID` | Site ID of the **apex/marketing** Netlify site — *not* this docs app. That site owns the cached proxy responses. Required alongside `NETLIFY_PURGE_TOKEN` |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Product analytics. **Same PostHog project as the marketing site**, so a visitor is one person across agilitycms.com, /docs and app.agilitycms.com. No key = `init()` and all capture calls no-op ([lib/analytics/posthog.ts](lib/analytics/posthog.ts)). ⚠️ `NEXT_PUBLIC_*` is inlined at **build** time — setting it in Vercel needs a redeploy to take effect |
| `AGILITY_AUTH_COOKIE_NAME` | Cookie the signed-in probe looks for ([app/api/me/route.ts](app/api/me/route.ts)). Defaults to `AgilityAuthOWIN`; override only if Classic CM renames it. The route returns `{signedIn, validated, userId?}` and **never** the cookie value, email or name |
| `AGILITY_MANAGER_URL` | Classic CM base URL, e.g. `https://manager.agilitycms.com`. **Unset = presence-only** (a stale cookie reads as signed-in, `validated:false`). Set = the cookie is validated against `json/User/GetCurrentServerUser` once per session |

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
- **After a build, no *concrete* page should be postponed.** A postponed page re-renders on every request instead of serving static HTML. Check with `find .next/server/app -name '*.meta' | grep -v '\[' | xargs grep -l '"postponed"' | wc -l` — must be **0**. Do not count total postponed routes: every parameterized route legitimately contributes its own fallback shell, so that number grows as routes are added and means nothing on its own. Run it *before* and after a change; the baseline is what makes it a signal. This caught a bare `fetch` with `next: { revalidate }` in getRichSnippet (which caches nothing under Cache Components) that was costing eleven article pages a full render per request.
- **`dynamicParams` is not allowed either** (same family as `revalidate`). A route param that isn't in `generateStaticParams` therefore reaches the render and calls `notFound()` — a soft 404 (200 + not-found UI), the exact failure [proxy.ts](proxy.ts)'s published-path check exists to prevent. Any hand-written route with enumerable params must list its valid paths in `isAppPath`, **derived from the same source the pages are built from** (this is why the API reference reads checked-in OpenAPI snapshots rather than the live specs — a live spec could add a slug the proxy hasn't heard of).
- **The App Insights `Math.random()` failure behaves differently in `next start` than in production — don't design around the local symptom.** Locally one process serves every route, so the SDK loaded by `/api/mcp` is live everywhere and a *dynamic* render answers **500**. On Vercel each route is its own function and `initializeTelemetry()` is called only at module scope of [app/api/mcp/route.ts](app/api/mcp/route.ts), with **no `instrumentation.ts`** — so page functions never load it (file tracing, 2026-09-20: 2,756 appinsights/otel files in the MCP route vs 47 inert ones in a page route) and the production symptom is the soft 404 above. ⚠️ Moving telemetry into an `instrumentation.ts` would hoist it into every route at once and make the 500 real in production — if that refactor ever happens, every dynamic render becomes a 500 and this note is the thing to read first.
- **`export const revalidate` is not allowed** with Cache Components — lifetimes live in `cacheLife()` inside cached scopes.
- **generateStaticParams must return ≥1 result** under Cache Components (no dev-mode empty shortcut).
- **proxy.ts matcher must include bare `/`** (see Routing above).
- **New cache tags must be added in two places**: the lib/cms getter AND the `/api/revalidate` webhook.
- **Publishing redesigned pages before deploying the redesign branch breaks production** — the live bundle won't know the ocean components.
- **Authoring docs content via the Agility MCP**: follow the skill at [.claude/skills/authoring-agility-docs/SKILL.md](.claude/skills/authoring-agility-docs/SKILL.md) — full category→container map, case rules, image-upload workflow, preview/edit link templates. `save_content_items` still always writes to the instance default state (**Staging**) — `state` is ignored on save — but the MCP **can** now take content live: `publish_content` / `unpublish_content`, `manage_content_workflow`, `publish_page` / `unpublish_page`, and `delete_content_item` all exist (verified 2026-07-28; earlier docs said otherwise). They run with the caller's Agility permissions. **Publishing is an outward-facing action on the live docs site — confirm with a human before calling it.** Known Agility MCP server bugs (phantom `save_page_model`, module reordering is a no-op, occasional dropdown choice mangling, `initialize_media_upload` double-prefixing the folder path) are logged in [docs/rebuild-plan-2026.md](docs/rebuild-plan-2026.md) §4 — with 2026-07-29 notes on which no longer reproduce.
- **Never use `dynamicPageItem.seo.sitemapVisible` as a robots signal.** It is `false` by default on every `DocArticle`, so treating it as "noindex" deindexes the entire knowledgebase. See the note in [lib/cms-content/resolveAgilityMetaData.ts](lib/cms-content/resolveAgilityMetaData.ts). Archive/noindex lifecycle lives in [lib/docs/legacyFrameworks.ts](lib/docs/legacyFrameworks.ts).
- **SVG diagrams must be dual-theme in one file.** Every diagram generated for this site carries both themes itself — **never** a single-theme SVG, and never a light/dark *pair* (two files doubles the CDN paths and the re-upload burden). The rule: no colour in presentation attributes; every `fill=`/`stroke=` becomes a semantic class in a `<style>` block, light declared bare as the default, dark overriding inside `@media (prefers-color-scheme: dark)`. Use the 2026 token values and respect the fill/type split (`.f-primary` `#027970`→`#028D83`; blue as *text* on dark is `#5989D8`, never `#295BAC`). Reference implementation: [docs/diagrams/docs-diagram-ai-mcp.svg](docs/diagrams/docs-diagram-ai-mcp.svg) (or fetch any live diagram from the media library). **The rule applies wherever the file ends up** — a diagram uploaded straight to Agility with no repo copy is held to it just the same. ⚠️ **The other half of this is on the page, not in the SVG:** an SVG embedded via `<img src>` is its own document, so `prefers-color-scheme` inside it follows the **OS** unless the embedding page sets CSS `color-scheme`, whose used value propagates into the image. This site does that (see Web Stack) — a `dark` class alone would not be enough. If a diagram looks stuck in the wrong theme on a new surface, check the page's `color-scheme` before touching the SVG.
- **Diagrams are Agility media assets, like every other image on this site.** The published file lives in the media library of instance `67bc73e6-u` and is referenced as `https://cdn.aglty.io/agility-cms-docs/docs-redesign/<name>.svg` — `cdn.aglty.io` is that library's CDN, **not** a cache in front of the repo. **Agility is the system of record.** [docs/diagrams/](docs/diagrams/) holds working sources for the three original diagrams only; **most diagrams from here on will be Agility assets with no repo copy**, so never assume a live diagram has a source in the tree, and never treat the tree as canonical. Where a repo source *does* exist, editing it changes nothing live until the asset is replaced **under the same filename** (repo filenames deliberately match) — the August 2026 palette change sat unuploaded for weeks this way. Check by diffing the live copy against the source (`curl -s <cdn-url> | diff - docs/diagrams/<name>.svg`), not by grepping for old hexes: `#181716` is Stone's dark `--bg` *and* the light theme's `--text`, so a correct current file still matches it.
- **The redesign plan** lives in [docs/rebuild-plan-2026.md](docs/rebuild-plan-2026.md) (phases, open decisions); design handoff in `docs/plan-handoff.md`; hosting portability rules in [HOSTING.md](HOSTING.md).
