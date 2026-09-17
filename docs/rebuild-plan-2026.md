# Docs Site Rebuild Plan — Ocean Redesign, TypeScript, Next.js Latest

**Status:** Approved-pending-review · **Branch:** `rebuild/ocean` · **Owner:** Joel Varty
**Inputs:** [plan-handoff.md](plan-handoff.md) · [agility-docs-mockup-ocean.html](agility-docs-mockup-ocean.html) · main-site design system (`Agility-Website-Nextjs/designs/design-system-components-ocean*.html`)

---

## 1. Architecture decision: two projects, one design system

**Recommendation: keep the docs site as its own Next.js project.** Do NOT merge it into the main marketing site. Rationale:

1. **Different Agility instances, different lifecycles.** The new marketing site is being built from scratch in a *new* instance; docs stays on `67bc73e6-u` with ~42 containers and hundreds of articles we must not disturb. One app serving two instances means two sets of API keys, two preview systems, two webhook/ISR pipelines, and tangled sitemaps — all cost, no benefit.
2. **Independent deploys.** Docs content ships daily via ISR + webhooks; marketing ships on campaign timelines. Coupling them makes every docs hotfix a marketing deploy and vice versa.
3. **The multi-zone pattern is the officially recommended one** for exactly this shape (Next.js Multi-Zones / Vercel Microfrontends). This repo is already a textbook zone child: `basePath: '/docs'` is set, all assets serve under `/docs/_next/*`.

### Is the rewrite "inefficient"? Somewhat — the fix is cache headers, not re-architecture.

The main site is on **Netlify**, docs on **Vercel**, so `/docs/*` is a Netlify proxy rewrite (`200` redirect) to the Vercel deployment. Netlify has **no Multi-Zones/Microfrontends product** — the proxy rewrite *is* its primitive (third-party options like Zephyr Cloud target module-federation microfrontends, not path-based zones — wrong tool here). The actual inefficiencies and fixes:

- **Proxied HTML is not cached at Netlify's edge today.** Netlify only caches proxied responses when the origin sends caching headers, and Vercel's ISR pages deliberately tell downstream CDNs not to cache (`max-age=0, must-revalidate`) so Vercel keeps invalidation control. Result: every `/docs` page view is Netlify edge → Vercel origin. Fix (Phase 0 task): the docs app emits the **standard RFC 9213 header `CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`** on pages. Verified precedence on **both** vendors is identical (`<Vendor>-CDN-Cache-Control` > `CDN-Cache-Control` > `Cache-Control`), so this one header makes any fronting CDN — Netlify today, Vercel or anything RFC-9213-compliant tomorrow — serve docs pages from its edge and refresh in the background. Vendor-specific variants (`Netlify-CDN-Cache-Control` / `Vercel-CDN-Cache-Control`) are reserved for the rare case of different TTLs per layer, documented in HOSTING.md when used. Instant purge (cache tags + purge APIs) is vendor-specific on both platforms — prefer the short-TTL+SWR design so we don't need it.
- **Static assets are fine.** `/docs/_next/static/*` is content-hashed and served with `immutable, max-age=31536000`, which Netlify's proxy caches per standard HTTP caching — no change needed.
- **Cross-zone navigation is a hard navigation** (full page load between marketing ↔ docs). Inherent to any two-app setup; mitigate by keeping the docs shell fast (App Router streaming, minimal JS).
- **Duplicated design system.** Today the two sites share nothing. Fix: extract the ocean tokens + primitives into a tiny shared package (see §5).
- **Rewrite config drift.** The rewrite lives in Netlify UI config, not in either repo. Action: check it into the new marketing repo's config (`netlify.toml`: `/docs/* → https://<docs-deployment>/docs/:splat 200`), reviewable like code, with the equivalent recipe for each supported vendor documented in HOSTING.md.
- **Netlify proxy timeout is 26 seconds** — irrelevant for pages, but it constrains the Phase 5b Ask-AI streaming endpoint if answers stream through the proxy. Verify streamed responses aren't cut off; if they are, serve chat from a route that bypasses the proxy. (Vendor delta — goes in HOSTING.md.)
- **Vercel Microfrontends is an optional optimization only** — if both sites ever land on Vercel it removes the cross-provider hop, but nothing in either codebase may *depend* on it (portability principle below).

### Hosting portability principles (agreed 2026-07-15)

Either site must be hostable on **Vercel, Netlify, or any combination** without code changes. Rules:

1. **Standard-first.** Reach for platform-neutral primitives before vendor features: Next.js config (`rewrites`/`redirects`/`headers`), Next middleware, ISR via `revalidate`/`revalidatePath`, `next/font`, `next/image`, RFC 9213 `CDN-Cache-Control`, standard `Cache-Control` semantics (`private, no-store` for personalized responses). All of these behave the same on Vercel and on Netlify's Next.js runtime.
2. **No vendor SDKs or storage in app code.** No Vercel KV/Blob/Edge Config, no Netlify Blobs, no `@vercel/*`/`@netlify/*` imports in `app/`/`lib/` (build plugins in config are fine). State lives in Agility, Algolia, or the future Azure index — all host-independent.
3. **Vendor-specific config is allowed but quarantined and documented.** It may live only in `netlify.toml` / `vercel.json` / provider dashboard, never interleaved in app code; anything set in a dashboard must be mirrored in **`HOSTING.md`** (new Phase 0 deliverable), which records: the `/docs/*` proxy contract (below) with a per-vendor recipe, the cache-header strategy and why, every dashboard-only setting, and known vendor deltas (Netlify 26s proxy timeout; Vercel 10–20 MB cacheable-response caps; purge/cache-tag APIs differ; Netlify `durable` cache directive is Netlify-only).
4. **The proxy contract is the interface between the two sites:** whichever deployment serves the `agilitycms.com` apex MUST reverse-proxy `/docs/*` to the docs deployment, preserving path, query, cookies, and request headers, and MUST NOT cache responses beyond what the docs origin's `CDN-Cache-Control` allows. Any host that can express this (Netlify `200` rewrite, Vercel `rewrites()`, Cloudflare, plain nginx) is a valid apex.
5. **Escape-hatch test:** before adopting any vendor feature, write down how we'd replicate it on the other vendor. If the answer is "we can't," it needs explicit sign-off and an entry in HOSTING.md's "lock-in register."

**Coordination needed with the marketing rebuild (§8) — nothing blocks us starting now.**

---

## 2. Target stack

| Area | Today | Target |
|---|---|---|
| Framework | Next.js 14, Pages Router (App Router only for MCP) | Latest stable Next.js (16.x line — pin exact version at kickoff), **App Router only** |
| Language | JS with a sprinkle of TS | **TypeScript everywhere, `strict: true`** |
| React | 18 | 19 (whatever the Next version pins) |
| Styling | Tailwind 3 + nightwind | **Tailwind v4 CSS-first `@theme`**, ocean tokens, class-based dark via `data-theme` |
| Data | Apollo Client + `@agility/nextjs` 14 | `@agility/nextjs` latest (App Router SDK); GraphQL via typed `fetch` + codegen (drop Apollo — we only do server-side queries; Apollo's cache/runtime is dead weight in RSC) |
| Fonts | — | Mulish (body), Inder (headings, 400-only — see handoff gotcha), Fira Mono |
| Search | Algolia `doc_site` | Keep; re-skin the ⌘K experience; "Search or ask AI" combined affordance |
| MCP | `/docs/api/mcp` (App Router, TS) | Keep as-is; it's already the target architecture |
| Rendering | ISR (Pages Router) | ISR via App Router (`revalidate` + on-demand `revalidatePath` from CMS webhooks) |
| Errors/analytics | Sentry 6 (ancient), App Insights | Sentry latest; keep App Insights only if still consumed |

**Drops:** `nightwind` (replaced by real token-based theming), `react-html-parser`, `fuzzy-search`, `next-connect`, `axios` (fetch), Apollo. **Keep:** the EditorJS render path (hundreds of articles still have `content` blocks; rendering is plain React in `components/common/blocks`, no EditorJS packages). **Removed 2026-07-18:** the EditorJS custom-field editor + its image/link API routes — the block editor now ships as a separate Agility App, so all `@editorjs/*` packages, `@agility/content-management`, `image-size`, and `fuzzy-search` are gone from this repo.

### Migration strategy: rebuild-in-place on one branch

This is a reskin + re-platform, not a refactor — porting Pages-Router components one-by-one would make us style everything twice. Instead, on `rebuild/ocean`:

1. Scaffold the new `app/` tree beside the existing `pages/` tree (Next supports both concurrently; a route must exist in only one).
2. Build the new shell (tokens → layout → article rendering) in `app/`, **porting logic, not markup**, from the old components. The GraphQL queries, `utils/searchUtils`, sitemap logic, and EditorJS/Markdown render pipelines move over as typed modules.
3. Route-by-route cutover: an App Router route wins as it lands; delete its Pages Router counterpart in the same PR.
4. Finish: delete `pages/` (except nothing — API routes move to `app/api/*` route handlers), remove dead deps, flip `tsconfig` to strict.

**URL invariant (handoff hard constraint #1): every existing article URL, the sitemap.xml, robots.txt, RSS of changelog, and the search-index/webhook API routes keep their exact paths.** The dynamic-page URL space is defined by the Agility sitemap (`overview/…`, `developers/…`, per-framework trees, `changelog`, etc.) — the App Router equivalent is one `app/[...slug]/page.tsx` driven by `getAgilityPage`, same as today's `pages/[...slug].js`.

---

## 3. Build phases

Phases map to the handoff task list (T1–T7). Each phase = one or more reviewable PRs into `rebuild/ocean`; merge `rebuild/ocean` → `main` when the cutover checklist (§7) passes.

### Phase 0 — Platform (enables everything, no visual change)
- Upgrade Next/React/TS/Tailwind v4 toolchain; get the *existing* site compiling and rendering on it (Pages Router still on Next 15/16 works — this de-risks the big bump separately from the rewrite).
- `tsconfig` strict for new code (`app/`, `lib/`, `utils/` as they're touched).
- Typed CMS layer: `lib/cms/` gets typed GraphQL fetchers (+ codegen from the GraphQL endpoint), explicit `take: 250` on every list query (AGENTS.md gotcha), preview/published switch preserved.
- CI: typecheck + lint + build on PR.

### Phase 1 — T1: Token layer & dark mode
- Ocean tokens verbatim from the handoff §3 into `styles/tokens.css` under Tailwind v4 `@theme`, with `html[data-theme]` light/dark blocks exactly as the mockup.
- `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
- Three-state theme control (light/dark/system) + no-flash inline head script (`localStorage` + `prefers-color-scheme`) — correct in the real app per handoff constraint #4.
- Fonts: Mulish/Inder/Fira Mono via `next/font`.
- **Done when:** theme toggles with no reload flash; AA contrast checks from handoff §6 pass (compute, don't eyeball).

### Phase 2 — T2: Component models + zone renderer (CMS ⇄ code)
CMS side (via Agility MCP, following `.claude/skills/authoring-agility-docs`; **workflow/publish steps are manual in the UI**):
- New page models: `Docs Landing Page` (zones: Hero, Featured, Main, Sidebar) and `Docs Article Page` (zones: Header, Body, Aside). Existing `Main Template` / `With Sidebar Nav Template` / `Full Width Template` stay untouched until cutover.
- New component models per handoff §4: `PageHero`, `MediaHero`, `FeatureCardGroup`+`FeatureCard`, `ArticleListSection`, `LinkCard`, `CodeBlock`, `CalloutBlock`, `ThemeAwareImage`. **No models beyond this list without sign-off** (handoff gotcha).
Code side:
- Generic zone renderer (App Router version of the module registry) — loops zones, renders registered components; no per-page layout code.
- One typed React component per model, ocean-styled, both themes.
- Port the article renderer: EditorJS blocks + the `unified`/remark/rehype Markdown path with its exact current semantics (H1→title strip, GFM, raw HTML incl. scripts, fenced-only code, images untransformed) so no article regresses.
- Re-skin chrome: topbar (with docs sub-brand + theme control), sidebar nav (grouped, mono eyebrows), right-rail TOC with scroll-spy, prev/next, feedback footer — all per mockup. **Done 2026-07-18:** lean 60px topbar + code-defined docs footer (Stripe/Vercel pattern; cross-instance chrome dependency eliminated), mockup .shell article grid, eyebrow-grouped sidebar, .toc rail with scroll-spy, article header (section eyebrow + left title + description lede), ArticlePrevNext section pagination. UI primitives: shadcn-style Radix in components/ui; @headlessui/react removed.
- **Done when:** a test `Docs Landing Page` composed in Web Studio renders correctly in both themes.

### Phase 3 — T3–T5: Hub, flagship pages, section reorder (mostly content)
- T3 Hub: new H1, three flagship FeatureCards (Web Studio / Page Management / MCP with primary/secondary/tertiary accents + AA ink pattern from the mockup), keep role cards + getting-help.
- T4 Flagship pages `/docs/web-studio`, `/docs/page-management`, `/docs/ai` — one commit each; MediaHero where captures exist. **Blocked on copy doc — see §9.**
- T5 Section reorders (Overview / Editors / Developers per handoff). **Done 2026-07-17 (staging):** Overview (page 5) got the "What makes Agility different" three-up FeatureCardGroup (+ dropped the junk `NewTestModel`); Editors (4) leads with a two-up Web Studio/Page Management band + an "AI-assisted authoring" ArticleListSection; Developers (3) got a positive hero rewrite (item 211, replacing the defensive lead — meta description updated to match), a two-up Page Management/Web Studio band, and a "Build with AI and the MCP server" cluster. Same two-step save workaround as the hub → legacy modules re-cloned; **newly unused originals for post-publish cleanup: 120/123/343/348 (overview), 207/210/314/321/357 (editors), 361/364/368/384/654/372/717 (developers)**. New nested containers: `Overview-WhatMakesAgilityDifBCF555`, `Editors-LeadFeatureCards`, `Editors-AIAuthoringLinks`, `Developers-LeadFeatureCards`, `DevelopersAIMCPLinks` (cards/links: items 1538–1552).
- AI-section article content is out of scope for code; build the shell so articles drop in.

### Phase 4 — T6 + T7: Routing, redirects, machine readability
- Flagship routes as Agility pages (they're content, not hardcoded routes).
- 301s server-side in `next.config` `redirects()` — the `/docs/overview/page-management` → `/docs/page-management` promotion is **open decision #1**; internal-link audit so nothing points into a redirect.
- `llms.txt` at `/docs/llms.txt`; per-article clean-markdown endpoint (`/docs/<article-path>.md` or `?format=md` — decide in PR); the MCP server's `fetch_doc` should share this serializer. **Done 2026-07-17:** `.md` suffix chosen (proxy rewrite → `app/api/article-md/[...slug]`, serializer in `lib/cms-content/articleMarkdown.ts`); `app/llms.txt/route.ts` builds from the cached published sitemap (flagships appear on publish). Still open: point the MCP `fetch_doc` at the shared serializer instead of Algolia-stripped HTML.
- Prompt-shaped titles/meta on flagship pages ("MCP server", "AI agent", "visual page builder", "page orchestration", "headless CMS").

### Phase 5 — Net-new experiences (the world-class layer)
**5a. Signed-in awareness + live API playground.**
- Detect an Agility session and greet with the user's instances; on API-reference pages, offer "Run this against *your* instance."
- Mechanism: **cookie detection.** app.agilitycms.com sets its auth cookie on the `.agilitycms.com` domain, and the docs site serves under `agilitycms.com/docs` (the Netlify proxy forwards cookies), so a docs route handler can see the session server-side. Two rules: (1) detection happens via a small client-side fetch to an **uncached** API route (`Netlify-CDN-Cache-Control: no-store`) so pages themselves stay cacheable at the edge (§1) and never leak personalized HTML; (2) local dev / direct `*.vercel.app` access won't have the cookie — build a dev fallback. For *executing* API calls as the user, confirm whether the app cookie can authorize management-API calls from the docs origin or whether we exchange it for a scoped token; the MCP server's OAuth popup remains the fallback.
- Playground v1: interactive fetch/GraphQL explorer on developer articles — pick instance → keys fetched via Management API → editable request → live response, with copy-as-curl/JS. `CodeBlock` model gets an optional `runnable` flag.
**5b. Ask-AI docs agent.**
- **⌘K palette shell shipped 2026-07-18** (`components/common/SearchModal.js`): rich Algolia search modal with keyboard nav and a `mode` switch + "Ask AI — coming soon" affordance reserved for the agent. Remaining 5b work is the agent itself:
- v1 (ship with redesign): "Search or ask AI" in the ⌘K palette → `/docs/api/chat` route handler → Claude with tool use over the **existing docs MCP tools** (`search_docs`, `fetch_doc`). Streaming answers with citation links. Cheap, grounded, no new infra.
- v2 (fast follow + flagship example content): hybrid **semantic + vector Azure AI Search** index built from the same normalized article corpus the Algolia indexer uses (`utils/searchUtils`); agent retrieves via hybrid ranking; publish the build itself as a docs article/example. Keeps Algolia for keyword ⌘K; A/B the retrieval quality before swapping anything.
- This is handoff **open decision #3** — v1 scope is small enough that I recommend "yes, ship with redesign."

---

## 4. CMS changes (all additive — instance barely changes)

| Change | Type | Notes |
|---|---|---|
| 2 page models, ~9 component models | Add | §3 Phase 2; nothing existing modified |
| Hub + 3 flagship pages, section-landing recompositions | Add/edit pages | Composed in Web Studio from new components |
| AI articles container pair (`AIArticles` + `AISections`) if AI becomes a real top-nav category | Add | Follows the existing category→container-pair convention exactly; case-sensitive reference names on write |
| Existing Doc Article/Doc Section models, all article content, all URLs | **Untouched** | Hard constraint |

### Agility MCP server bugs found while executing (file on agility-mcp-server)
1. **`save_page_model` phantoms** — returns success + pageTemplateID, but the model never appears in `get_page_models` and `save_page` against it fails. Workaround: create page models manually in the UI (we skipped new page models entirely).
2. **Module ordering is write-only** — `reorder_page_modules` returns success but is a no-op (verified on pages 2 and 58; versionID bumps, order unchanged), and `save_page` ignores the zones array order for modules already on the page (existing keep their old order, new ones append). Workaround used for the hub: save the page with only the modules you want *first*, then save again appending the rest — re-added modules are **cloned to new contentIDs** in array order. Side effect: the original module items (92/101/99/327 on home) become unused once the staging version publishes.
3. **DropdownList choices get mangled on model save** — label/value pairs shift (`"three-up\nTwo-up"` etc.). Happened on FeatureCard.Accent, FeatureCardGroup.Layout, PageHero.Theme; all re-saved correctly on 2026-07-16. Check CodeBlock/CalloutBlock dropdowns before T4 content drops. *(Re-verified 2026-07-29: a 45-choice `Icon` DropdownList added to the `Link` model via `save_content_model` stored cleanly — mangling did not recur. Still worth a spot-check after any dropdown save.)*
4. **`initialize_media_upload` double-prefixes the folder path.** Passing `folderPath: "agility-cms-docs/logos"` (instance name + folder) returned an asset URL with the instance segment doubled: `cdn.aglty.io/agility-cms-docs/agility-cms-docs/logos/…`. `folderPath` is relative to the media-library root — pass just the folder (`logos`), not the CDN/instance prefix. The doubled URL still resolves and serves, so it's cosmetic; re-upload with a bare path if a clean URL matters. (Observed 2026-07-29 uploading the Angular hero logo. The upload token itself worked fine within its 5-minute window — the older "instant-expiring token" note no longer reproduced.)

---

## 5. Shared design system with the marketing site

Smallest thing that works, in order of preference:
1. **`@agility/ocean-tokens` package** (private npm or workspace file dep): `tokens.css` (the `@theme` + both theme blocks), font config, and the handful of primitives both sites truly share (button, badge, callout). Both repos consume it; the tokens in handoff §3 are the source of truth.
2. Until that package exists: copy `tokens.css` verbatim and treat the handoff as canonical — divergence is a bug.

Docs-specific components (sidebar, TOC, article prose, code panels) stay in this repo. Don't over-share; the sites have different jobs.

---

## 6. Verification (handoff §6 — run per PR, paste into description)
- Tags/braces balanced; **zero undefined `var(--x)`**; no `localStorage` in any artifact/preview build.
- Theme cycle light→dark→system; system tracks `prefers-color-scheme` live; no reload flash.
- Computed AA ratios for body text + every flagship-card ink in both themes (reference values in handoff §6, incl. the teal-on-`--bg` 4.51:1 watch item → prefer `--primary-dim` on `--bg`).
- Keyboard focus visible everywhere; reduced motion respected; responsive to mobile (sidebar/topnav collapse, cards stack).
- URL audit: crawl old sitemap vs new — every published article URL 200s identically; redirects are single-hop 301s.
- Search indexing + webhook endpoints still function; MCP endpoint unchanged.

## 7. Cutover checklist (merge `rebuild/ocean` → `main`)
- All §6 checks green on a full production build.
- Algolia re-index from the new build; ⌘K works.
- Known follow-up (non-blocking): `@headlessui/react` v1 causes a dev-visible hydration id mismatch (`headlessui-disclosure-button-undefined`) in the sidebar Disclosure tree — upgrade headlessui (v1.7+ uses React `useId`) in its own PR; v2 has breaking API changes (`Dialog.Overlay` etc.).
- Vercel preview URL soak-tested behind the main-site rewrite (staging path).
- Error reporting decision: Sentry 6 was REMOVED 2026-07-18 (dead config, never worked with App Router, 30+ vulns). Re-add @sentry/nextjs latest at cutover if error reporting is wanted, or rely on App Insights + Vercel logs.
- Old Pages Router routes deleted; bundle diff reviewed.

## 8. Coordination with the marketing-site rebuild
1. **Rewrite ownership:** new marketing repo checks in `rewrites: [{ source: '/docs/:path*', destination: 'https://<docs-deployment>/docs/:path*' }]` (or adopts Vercel Microfrontends with `microfrontends.json`). Docs team owns everything under `/docs`.
2. **Tokens package** (§5): agree on repo/registry; marketing's `design-system-components-ocean*.html` and this handoff must not drift.
3. **Header/footer parity:** docs keeps its own lightweight topbar (per mockup) but link targets/logo/legal footer must match marketing. Exchange a JSON nav contract, not components.
4. **Redirect registry:** one shared list of 301s so marketing's router never shadows a docs path.
5. **Timeline independence:** docs redesign can ship behind the *current* production rewrite before the new marketing site exists.

## 9. Design inspiration references (agreed 2026-07-15)

**Visual & layout** (screenshot these; measure our build against them):
- **Stripe** — three-column article layout, scroll-synced TOC, code-right pattern, restrained color.
- **Tailwind CSS** — typography craft, ⌘K search feel, personality without decoration (closest to the ocean temperament).
- **Payload CMS** — dark-mode-first excellence; our dark theme should compete here, not just "support dark."
- **Linear** — editorial tone; the model for the `/docs/changelog` re-skin.

**Signed-in + API playground (Phase 5a)** — blend of:
- **Stripe** — logged-in users see their (test) keys inline in code samples: the flagship "it knows me" moment.
- **Supabase** — instance/project picker in docs; snippets rewrite with your URLs/keys (matches our multi-instance reality).
- **Clerk** — personalized quickstarts as the lighter-touch v1 pattern if the full console lands later.

**AI & machine readability (Phases 4, 5b)**:
- **Anthropic docs** — copy-page-as-Markdown, `.md` endpoints, `llms.txt`, cited ask-AI (our T7 checklist in production).
- **Cloudflare docs** — markdown endpoints + llms.txt at scale; URL-scheme precedent.
- **Supabase AI assistant** — aspirational convergence of assistant + acting on your project.

**Competitor teardown — scheduled before Phase 3 (hub design):** structured, screenshot-based review of **Contentful, Sanity, Storyblok** docs plus **Shopify.dev** (role-based IA benchmark), scoring: time-to-first-success for a new dev, role-based pathing (Editors/Developers/Admins), search & ask-AI quality, and AI/MCP story. Output: comparison report checked into `docs/`.

## 10. Open items (need Joel / owner input — nothing blocks Phases 0–2)
1. **Missing input docs:** the handoff references `agility-docs-master-build-plan.md` and `agility-docs-copy-and-build-strategy.md` (Part A = all page copy). **Neither is in this repo.** Needed before T3/T4 content drops.
2. Handoff open decision 1: promote-and-301 `/docs/overview/page-management`? (Blocks part of Phase 4.)
3. Handoff open decision 2: keep Inder for headings (400-only, synthesized bold) or pick a heading face with real weights? (Affects Phase 1; default: keep Inder, flag don't substitute.)
4. Handoff open decision 3: Ask-AI now vs later → recommendation in §3 Phase 5b: ship v1 (MCP-tools-backed) with the redesign.
5. Handoff open decision 4: how many AI-section articles are publishable (gates content drop).
6. Playground auth: confirm the `.agilitycms.com` auth cookie's flags/scope (httpOnly, SameSite) and whether it can authorize Management-API calls made from/for the docs origin, or whether a token-exchange endpoint is needed (OAuth popup as fallback).
7. Hosting for the new marketing site: staying on Netlify (keep the tuned proxy + `Netlify-CDN-Cache-Control` approach in §1) or moving to Vercel (adopt Vercel Microfrontends, drop the cross-provider hop)?
