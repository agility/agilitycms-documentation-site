# Plan: one docs site (retire demo.agilitycms.com/docs)

Joel, 2026-11-20: "pull ALL of the text out of the [demo] docs site and repurpose it into the docs site. It's too complicated to keep everything all over the place. Some of the stuff doesn't make sense anymore anyways." And: "we can just redirect demo.agilitycms.com/docs over to the /docs/nextjs section."

Status: **done (2026-11-21).** Phase 1 published; phase 2 merged (demo #40, #39) and verified in production. Open: demo code fixes (section 6).

## 1. Decisions (Joel, 2026-11-20)

1. **The docs CMS (`67bc73e6-u`) is the only home.** The demo repo keeps no docs: its `docs/` folder and its `/docs` renderer are deleted. No sync script.
2. **Repurpose, don't port.** Each piece of demo text is merged into the existing docs article that covers it, becomes a new article, or is dropped. Nothing moves verbatim, and there is no separate "demo site" section.
3. **demo.agilitycms.com/docs redirects to `/docs/nextjs`.** Where an old page's content now lives in a specific article, that page redirects to the article. Everything else goes to `/docs/nextjs`.

## 2. What we found (triage of all 35 files, 2026-11-20)

Four reviewers read every demo doc against the current demo code (Next 16.3.5, `main` at 640f686) and against the docs articles that cover the same ground. In short:

- **Most of it is already in the docs site, in better shape.** The Training Guide (`/training-guide/*`) is the generic half of this same material, ported earlier, with the same four roles and screenshots. The editor, admin and architect files are thin demo wrappers that defer back to it. Several files are near-verbatim duplicates: `admin/workflows.md` of `/training-guide/admin-workflow`, `AB_TESTING.md` of `/owners-admins/a-b-n-testing-in-agility-cms`, and `POSTHOG_IMPLEMENTATION.md` of `/apps/posthog`.
- **Most of the code docs are out of date.** Nearly all the developer files predate the demo's Next 16 / Cache Components rewrite (demo #29, 2026-09-22). Examples: `unstable_ViewTransition` and a removed experimental flag; eager PostHog init (now lazy); a footer `language-toggle.tsx` that no longer exists; personalization helper functions that were never in the current code; environment variable names (`AZURE_OPENAI_*`, `ALGOLIA_API_KEY`) the code never reads; Node 20.
- **Some of it is wrong in ways that matter.**
  - `api-routes.md`, `deployment.md`, `admin/configuration.md` and the demo `README.md` (line ~424) all say `AGILITY_SECURITY_KEY` secures the revalidate webhook. The code never checks it; webhooks are signed with a per-webhook `whsec_` secret.
  - Component and model counts disagree across files. The code registers 21 components; files and the hub say 20 or 21, and 22 or 24 models.
  - Two files carry a private PostHog project and dashboard URL.
  - `MULTI_LOCALE_IMPLEMENTATION.md` links to the old `nextjs-demo-site-2025` repo.
- **One correction runs the other way.** The demo's copies of the AgilityPic and image best-practices articles are *newer* than the published ones. They fix focal-point cropping: setting `height` on every source makes focal points work. The published AgilityPic article tells readers to hand-write a `<picture>` instead, which is wrong.
- **Real reference material that exists nowhere else on the docs site:**
  - the audience/region personalization pattern;
  - the proxy's query-string contract (`?lang=`, the whitelist, the `~~~` path encoding that keeps pages static);
  - shared-element page transitions with React `<ViewTransition>`;
  - the platform-agnostic `analytics` layer with lazy PostHog loading;
  - the AI agent, clean-markdown (`/{path}.md`) and MCP endpoints;
  - the Agility app's URL patterns (`app.agilitycms.com/instance/...`).

## 3. Where every file goes

**New and rewritten articles must be written from the current code, not from the demo text** (the code samples in the demo files don't match the real files). CMS-side facts (model lists, field names, page composition) are checked in the demo instance with the Agility MCP before they are published.

### 3.1 Changes to existing docs articles

| Docs article | Change | From |
|---|---|---|
| `/nextjs/using-the-advanced-next-js-demo-site` (1377, the demo hub) | Becomes the one demo overview. Add: a content map (component to content model wiring; Post to Author/Category/Tags; page to components); "Where things live" (folders, what `proxy.ts` owns); the integration list (Azure OpenAI or OpenAI, Algolia, PostHog, `/api/mcp`, `llms.txt`); an environment variable table regenerated from the code. Fix: 21 components (count from the code), the model count from the instance, caching is `cacheLife("days")` plus tag revalidation (not "60-second TTL"). Repoint every `demo.agilitycms.com/docs` link to the articles below | content-editor/*, admin/configuration, architect/*, developer/README, codebase/README, project-structure, components, ENVIRONMENT_VARIABLES |
| `/nextjs/using-the-agilitypic-component-for-responsive-images` | Replace the focal-point section with the demo's corrected one (width and height per source; a worked PostCard example; the upscaling caveat). Add performance tip 6 (set `height` on every `object-cover` source). Remove "upload at 72 DPI" | agility-pic-component.md (newer than the published copy) |
| `/overview/image-best-practices` | Add the focal-point TL;DR row and section, and qualify "won't upscale". Keep the docs copy's newer SVG section. Fix "AgilityPic appends `format=auto` to all URLs" (only when `fallbackWidth` > 0 or a source has `w`/`h`) | image-recos.md (forked copy) |
| `/nextjs/multi-locale-support-with-next-js` | New section: handling `?lang=` and filtering query strings in the proxy (whitelist, tracking parameters, 500-character cap, `~~~` encoding) | developer/MULTI_LOCALE_IMPLEMENTATION.md |
| `/apps/posthog` and `/owners-admins/a-b-n-testing-in-agility-cms` (1443) | A link to the new analytics article. Check 1443's demo links | AB_TESTING.md, POSTHOG_IMPLEMENTATION.md |

### 3.2 New articles

| Proposed path | Title (working) | Written from |
|---|---|---|
| `/nextjs/audience-and-region-personalization-with-next-js` | Audience and region personalization with Next.js | `src/lib/hooks/useAudienceRegionParams.ts`, `src/lib/utils/audienceRegionUtils.ts`, `src/lib/cms-content/get*ListingWithContentID.ts`, `PersonalizedBackgroundHero`, `PersonalizedLogoStrip`, the proxy contract. Edge detection with `@agility/geo` is future work (it isn't imported yet) |
| `/nextjs/view-transitions-with-next-js` | Shared-element page transitions with React ViewTransition | `src/lib/hooks/useViewTransition.ts`, `PostCard.tsx`, `PostImage.tsx`, `src/styles/view-transitions.css`. Re-check browser support |
| `/nextjs/analytics-layer-with-posthog-in-next-js` | A platform-agnostic analytics layer with PostHog in Next.js | `src/lib/analytics/*`, `src/components/analytics/*`, `src/instrumentation-client.ts` (lazy load), the event and property reference (from ANALYTICS_DASHBOARD.md, without the private dashboard URL), `experiment_exposure`/`experiment_interaction` |
| `/nextjs/ai-search-markdown-and-mcp-endpoints` | AI search, clean Markdown and an MCP server in a Next.js site | `src/app/api/ai/*`, `src/lib/ai/*` (CMS-held prompt, Algolia tool, contact-capture tool, Azure/OpenAI switch), `src/app/api/page-md`, `src/app/api/mcp`, `src/app/llms.txt` |
| `/developers/agility-app-url-patterns` | Agility app URL patterns | AGILITY_CMS_URL_PATTERNS.md, generic part only (no demo instance IDs). Useful for deep links and agents |

Titles and copy go through the brand-voice check. The docs rules apply too: no em dashes, Staging first, a named reviewer publishes.

### 3.3 Dropped (content already covered, wrong, or internal)

| Demo file | Why |
|---|---|
| `README.md`, `admin/README.md`, `architect/README.md`, `developer/README.md`, `developer/codebase/README.md` | Index pages. The hub covers them |
| `content-editor/pages.md`, `components.md`, `content-models.md`, `common-tasks.md`, `README.md` | Generic parts duplicate `/training-guide/content-editor-*`. The demo-specific catalogue goes into the hub's content map |
| `admin/configuration.md`, `content-setup.md`, `workflows.md` | Wrong webhook-security claim; contradicts the other model docs; `workflows.md` duplicates `/training-guide/admin-workflow` |
| `architect/architecture.md`, `content-architecture.md`, `component-architecture.md`, `integrations.md` | Generic parts duplicate `/training-guide/architect-*` and `/nextjs/caching-with-next-js-and-agility`. The facts that hold go into the hub |
| `developer/codebase/content-models.md`, `deployment.md`, `api-routes.md` | Out of date and partly wrong. Deployment is covered by `/nextjs/deploying-next-js-to-vercel` and `-netlify`. The useful endpoints are rewritten from code in section 3.2 |
| `developer/AB_TESTING.md`, `POSTHOG_IMPLEMENTATION.md`, `developer/ANALYTICS_DASHBOARD.md` | Weaker duplicates of `/owners-admins/a-b-n-testing-in-agility-cms` and `/apps/posthog`; the dashboard file is a private dashboard. The event reference goes into the analytics article |
| `assets/README.md` and `docs/assets/` (60 images) | Internal. The screenshots the docs use are already on the CDN |

## 4. Work

### Phase 1: docs content (instance `67bc73e6-u`, all saved to Staging)

1. Verify the demo's CMS-side facts in the demo instance (model list and count, component list, page composition, model types for Author and Category).
2. The six article changes in section 3.1. The two image fixes come first, because the published AgilityPic advice is wrong today.
3. The five new articles in section 3.2, written from the demo code at a pinned commit.
4. A reviewer reads and publishes. Search (Algolia) reindexes on publish.

Known traps for this instance: a management-API save replaces the whole field set; `save_page` can stamp a `pullDate` that auto-unpublishes the page; `reorder_page_modules` re-parents a page.

### Phase 2: demo repo PR (after phase 1 is published)

1. **Redirects (301)** in `next.config.mjs`, for `/docs`, each old path, and its `.md` variant:

   | Old demo path | Redirect to |
   |---|---|
   | `/docs/developer/MULTI_LOCALE_IMPLEMENTATION` | `/docs/nextjs/multi-locale-support-with-next-js` |
   | `/docs/developer/AUDIENCE_REGION_SYSTEM` | `/docs/nextjs/audience-and-region-personalization-with-next-js` |
   | `/docs/developer/VIEW_TRANSITIONS` | `/docs/nextjs/view-transitions-with-next-js` |
   | `/docs/developer/ANALYTICS_INTEGRATION`, `ANALYTICS_DASHBOARD`, `/docs/POSTHOG_IMPLEMENTATION` | `/docs/nextjs/analytics-layer-with-posthog-in-next-js` |
   | `/docs/developer/AB_TESTING` | `/docs/owners-admins/a-b-n-testing-in-agility-cms` |
   | `/docs/developer/codebase/api-routes` | `/docs/nextjs/ai-search-markdown-and-mcp-endpoints` |
   | `/docs/agility-pic-component` | `/docs/nextjs/using-the-agilitypic-component-for-responsive-images` |
   | `/docs/image-recos` | `/docs/overview/image-best-practices` |
   | `/docs/AGILITY_CMS_URL_PATTERNS` | `/docs/developers/agility-app-url-patterns` |
   | everything else under `/docs` | `https://agilitycms.com/docs/nextjs` |

   All targets are on `https://agilitycms.com`. The final paths are whatever phase 1 publishes.
2. Delete `docs/`, `src/app/docs/`, `src/lib/docs/`, the docs entries in `src/app/sitemap.tsx`, and `"/docs"` in `src/lib/cms/publishedPaths.ts`.
3. Robots: after this, nothing on the demo site is meant for Google or Bing. Update the `robots.txt` comment and the proxy's `isDocsPath` exception (`src/proxy.ts`) so the noindex rule covers the whole site.
4. `AGENTS.md` and `README.md`: remove the in-site docs section; point to agilitycms.com/docs (the hub article). Fix the `README.md` webhook-security claim (the key isn't used).

### Phase 3: verify

- Every old demo docs URL returns a 301 to a page that returns 200 (scripted from the table).
- The hub article has no `demo.agilitycms.com/docs` links left (`search_instance` on the docs instance).
- Docs search, the MCP `search_docs`, and `/docs/llms.txt` list the new articles.
- The next Ahrefs (Tuesday) and Semrush (Monday) crawls show no new 404s.

## 5. Order

Phase 1, then phase 2, then phase 3. The redirects only ship once their targets are published. Demo PR #37 (Ahrefs fixes) can merge first and independently.

## 6. Progress

**2026-11-20, phase 1:**

- **Published:** the two image fixes. `/nextjs/using-the-agilitypic-component-for-responsive-images` (1378) and `/overview/image-best-practices` (1400).
- **In Staging, to publish together** (the overview links to the new articles):

  | Item | Change |
  |---|---|
  | 1958 | New: Audience and Region Personalization with Next.js |
  | 1959 | New: Shared-Element Page Transitions with React ViewTransition |
  | 1960 | New: A Provider-Agnostic Analytics Layer with PostHog in Next.js |
  | 1961 | New: AI Search, Clean Markdown and an MCP Server in a Next.js Site |
  | 1962 | New: Agility App URL Patterns (`/developers`) |
  | 1377 | Rewritten demo overview |
  | 529 | Multi-locale: new step 9 |
  | 1443 | A/B testing: links |
  | 1393 | PostHog: links |

- **Dropped:** the `/training-guide/admin-component-models` row. It already covers registration and case-insensitive matching.
- **Model and component counts:** checked in the demo instance (`13f09fe2-u`). It has 24 content models and 22 components. Two components, Pricing Offers for Accounts and Service Listing, are deprecated placeholders with no code. That leaves 20 in use, plus Rich Text Area, which matches the 21 the code registers.
- **Demo code issues found while writing** (not fixed; for a demo PR). The first is a security fix:
  - `/api/revalidate` verifies no webhook signature, so anyone can clear caches or trigger `BUILD_HOOK_URL`.
  - `/api/ai/agent` has no `stopWhen` and ignores the CMS prompt.
  - The `~~~` decoder doesn't decode `+`.
  - `getAudienceRegionFromSearchParams` compares raw names.
  - Trackers poll forever without PostHog keys.
  - PostHog init may double-count pageviews.
  - `README.md` says `AGILITY_SECURITY_KEY` secures webhooks. It doesn't.

**2026-11-20, phase 1 published.** All nine Staging items went live, and every internal link returns 200.

**2026-11-21, phase 2 merged:**

- Demo #40, from another session, redirected `/docs` to `/docs/nextjs`. It also removed the docs route and its packages, cleaned the sitemap and noindexed the site, but kept `docs/`.
- Demo #37, rebased on #40: hreflang lists only locales that have the page, and the language switcher link is `nofollow`.
- Demo #39, rebuilt on both: per-page redirects to the new articles, the old sections and `/docs` to the overview, `docs/` removed, AGENTS.md and README repointed.
- Verified in production: 10 redirect cases, a sitemap with no `/docs` URLs, no `fr` alternate on the English-only post, and `/`, `/blog`, `/pricing` and `/fr` return 200.
