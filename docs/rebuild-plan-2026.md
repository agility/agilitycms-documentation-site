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

- **Proxied HTML is not cached at Netlify's edge today.** Netlify only caches proxied responses when the origin sends caching headers, and Vercel's ISR pages deliberately tell downstream CDNs not to cache (`max-age=0, must-revalidate`) so Vercel keeps invalidation control. Result: every `/docs` page view is Netlify edge → Vercel origin. Fix (Phase 0 task): the docs app emits **`Netlify-CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`** on pages (browsers and Vercel ignore this header; only Netlify's CDN honors it). Docs pages then serve from Netlify's edge and refresh in the background — effectively ISR semantics extended to the fronting CDN. If we ever need instant purge, Netlify supports cache tags (`Netlify-Cache-ID`) + a purge API callable from the same CMS webhook that triggers revalidation; with a 60s TTL we likely don't need it.
- **Static assets are fine.** `/docs/_next/static/*` is content-hashed and served with `immutable, max-age=31536000`, which Netlify's proxy caches per standard HTTP caching — no change needed.
- **Cross-zone navigation is a hard navigation** (full page load between marketing ↔ docs). Inherent to any two-app setup; mitigate by keeping the docs shell fast (App Router streaming, minimal JS).
- **Duplicated design system.** Today the two sites share nothing. Fix: extract the ocean tokens + primitives into a tiny shared package (see §5).
- **Rewrite config drift.** The rewrite lives in Netlify UI config, not in either repo. Action: check it into the new marketing repo's `netlify.toml` (`/docs/* → https://<docs-deployment>/docs/:splat 200`), reviewable like code.
- **Netlify proxy timeout is 26 seconds** — irrelevant for pages, but it constrains the Phase 5b Ask-AI streaming endpoint if answers stream through the proxy. Verify streamed responses aren't cut off; if they are, serve chat from a route that bypasses the proxy.
- **If the new marketing site lands on Vercel instead** (it's being built from scratch — hosting is an open choice, §9), adopt **Vercel Microfrontends** (`microfrontends.json`, local dev proxy, no cross-provider hop) and everything above collapses into config.

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

**Drops:** `nightwind` (replaced by real token-based theming), `react-html-parser`, `fuzzy-search`, `next-connect`, `axios` (fetch), Apollo. **Keep:** the EditorJS render path (hundreds of articles still have `content` blocks) and the EditorJS **custom-field editor** under `pages/custom-fields` — that's a CMS-hosted tool, not site UI; migrate it last and mechanically.

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
- Re-skin chrome: topbar (with docs sub-brand + theme control), sidebar nav (grouped, mono eyebrows), right-rail TOC with scroll-spy, prev/next, feedback footer — all per mockup.
- **Done when:** a test `Docs Landing Page` composed in Web Studio renders correctly in both themes.

### Phase 3 — T3–T5: Hub, flagship pages, section reorder (mostly content)
- T3 Hub: new H1, three flagship FeatureCards (Web Studio / Page Management / MCP with primary/secondary/tertiary accents + AA ink pattern from the mockup), keep role cards + getting-help.
- T4 Flagship pages `/docs/web-studio`, `/docs/page-management`, `/docs/ai` — one commit each; MediaHero where captures exist. **Blocked on copy doc — see §9.**
- T5 Section reorders (Overview / Editors / Developers per handoff).
- AI-section article content is out of scope for code; build the shell so articles drop in.

### Phase 4 — T6 + T7: Routing, redirects, machine readability
- Flagship routes as Agility pages (they're content, not hardcoded routes).
- 301s server-side in `next.config` `redirects()` — the `/docs/overview/page-management` → `/docs/page-management` promotion is **open decision #1**; internal-link audit so nothing points into a redirect.
- `llms.txt` at `/docs/llms.txt`; per-article clean-markdown endpoint (`/docs/<article-path>.md` or `?format=md` — decide in PR); the MCP server's `fetch_doc` should share this serializer.
- Prompt-shaped titles/meta on flagship pages ("MCP server", "AI agent", "visual page builder", "page orchestration", "headless CMS").

### Phase 5 — Net-new experiences (the world-class layer)
**5a. Signed-in awareness + live API playground.**
- Detect an Agility session and greet with the user's instances; on API-reference pages, offer "Run this against *your* instance."
- Mechanism: **cookie detection.** app.agilitycms.com sets its auth cookie on the `.agilitycms.com` domain, and the docs site serves under `agilitycms.com/docs` (the Netlify proxy forwards cookies), so a docs route handler can see the session server-side. Two rules: (1) detection happens via a small client-side fetch to an **uncached** API route (`Netlify-CDN-Cache-Control: no-store`) so pages themselves stay cacheable at the edge (§1) and never leak personalized HTML; (2) local dev / direct `*.vercel.app` access won't have the cookie — build a dev fallback. For *executing* API calls as the user, confirm whether the app cookie can authorize management-API calls from the docs origin or whether we exchange it for a scoped token; the MCP server's OAuth popup remains the fallback.
- Playground v1: interactive fetch/GraphQL explorer on developer articles — pick instance → keys fetched via Management API → editable request → live response, with copy-as-curl/JS. `CodeBlock` model gets an optional `runnable` flag.
**5b. Ask-AI docs agent.**
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
- Vercel preview URL soak-tested behind the main-site rewrite (staging path).
- Sentry upgraded and reporting.
- Old Pages Router routes deleted; bundle diff reviewed.

## 8. Coordination with the marketing-site rebuild
1. **Rewrite ownership:** new marketing repo checks in `rewrites: [{ source: '/docs/:path*', destination: 'https://<docs-deployment>/docs/:path*' }]` (or adopts Vercel Microfrontends with `microfrontends.json`). Docs team owns everything under `/docs`.
2. **Tokens package** (§5): agree on repo/registry; marketing's `design-system-components-ocean*.html` and this handoff must not drift.
3. **Header/footer parity:** docs keeps its own lightweight topbar (per mockup) but link targets/logo/legal footer must match marketing. Exchange a JSON nav contract, not components.
4. **Redirect registry:** one shared list of 301s so marketing's router never shadows a docs path.
5. **Timeline independence:** docs redesign can ship behind the *current* production rewrite before the new marketing site exists.

## 9. Open items (need Joel / owner input — nothing blocks Phases 0–2)
1. **Missing input docs:** the handoff references `agility-docs-master-build-plan.md` and `agility-docs-copy-and-build-strategy.md` (Part A = all page copy). **Neither is in this repo.** Needed before T3/T4 content drops.
2. Handoff open decision 1: promote-and-301 `/docs/overview/page-management`? (Blocks part of Phase 4.)
3. Handoff open decision 2: keep Inder for headings (400-only, synthesized bold) or pick a heading face with real weights? (Affects Phase 1; default: keep Inder, flag don't substitute.)
4. Handoff open decision 3: Ask-AI now vs later → recommendation in §3 Phase 5b: ship v1 (MCP-tools-backed) with the redesign.
5. Handoff open decision 4: how many AI-section articles are publishable (gates content drop).
6. Playground auth: confirm the `.agilitycms.com` auth cookie's flags/scope (httpOnly, SameSite) and whether it can authorize Management-API calls made from/for the docs origin, or whether a token-exchange endpoint is needed (OAuth popup as fallback).
7. Hosting for the new marketing site: staying on Netlify (keep the tuned proxy + `Netlify-CDN-Cache-Control` approach in §1) or moving to Vercel (adopt Vercel Microfrontends, drop the cross-provider hop)?
