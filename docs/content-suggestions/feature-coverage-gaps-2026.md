# Feature coverage gaps: what Agility ships that the docs don't explain

> Produced 2026-10-03. Read-only research: nothing was saved, published or edited in Agility, Productboard, HubSpot or GitHub. Builds on [competitor-teardown.md](../competitor-teardown.md), [net-new-articles-2026.md](net-new-articles-2026.md) and [docs-modernization-plan-2026.md](../docs-modernization-plan-2026.md); items already proposed there (plan limits page, shared responsibility model, tenancy decision guide, WordPress migration, AI data handling, Gatsby Cloud cleanup, terminology sweep, MCP tool-count fix) are referenced, not repeated.

## Method

**Feature inventory (Question 2)** was built from six primary sources:

| Source | What was read | Notes |
|---|---|---|
| Docs-instance changelog (`ChangeLog`, 96 releases) | Release list via the Agility MCP; release bodies from the rendered [Developer Changelog](https://agilitycms.com/docs/changelog), focused on Oct 2024 to Oct 2026 | Nested `Changes` lists return empty fields over MCP list calls, so bodies were read from the live page |
| Productboard (workspace `agilitycms`) | Features with status `Launched` (56; 50 returned); `In Progress - Dev/Testing` (0); initiatives (0) | Statuses look unmaintained: most Launched items are 2021 to 2024. **No released-soon items found, so there is no "shipping soon" list** |
| Marketing pages | /product/features, /product/web-studio, /product/developers, /product/enterprise, /product/pricing, /product/pages, /product/content-managers, /solutions/multisite-deployments, /solutions/enterprise-grade-security, /solutions/modern-websites-and-seo, /security, /about-agility-cms/extendability, /about-agility-cms/collaboration | Fetched as server-rendered HTML |
| Integrations | [agilitycms.com/partners/integrations](https://agilitycms.com/partners/integrations) (21 listings) vs the docs Apps and Developers sections | |
| OpenAPI snapshots | `lib/api-specs/snapshots/management.json` (17 tags, 115 ops) and `fetch.json` (8 tags, 11 ops) | |
| MCP tool catalog | [mcp.agilitycms.com/tools](https://mcp.agilitycms.com/tools): 32 tools | |

**Coverage scoring:** a regex per feature over all 331 article Markdown files, counting articles with 3+ hits as "substantive", then opening the top hits to judge depth (none / mention / partial / full).

**Competitor comparison (Question 1):** 35 web fetches and searches against Sanity, Storyblok, Contentful, Contentstack, Hygraph and Strapi docs. Only capabilities Agility actually has (per the inventory) are compared. **Failed fetches:** Contentful returned HTTP 429 on all four attempts (webhooks overview, scripting migrations, App Framework, data model), so Contentful evidence comes from search results only; Hygraph asset transformations and scheduled publishing (404); Storyblok visual-editor guide and access-roles concept (404); Contentstack webhooks and workflows pages returned no sub-page list.

---

## Question 2: features Agility has that the docs under-cover

Depth key: **none** (no article explains it), **mention** (a sentence or a screenshot), **partial** (explained, but key behavior missing), **full**. Rows marked full are listed only when they matter for Question 1 or for a flag below; everything else that is full was left out to keep the table actionable.

### Publishing, workflow and editor productivity

| Feature | Evidence it exists | Docs coverage | What's missing | Audience | Pri |
|---|---|---|---|---|---|
| **Publishing includes nested linked content by default; "Publish this item only" opt-out** | Changelog 2026-09-23 (release 1674) | **none** (0 articles mention the new default or the checkbox; [publishing-a-content-item](https://agilitycms.com/docs/editors/publishing-a-content-item), [preview-and-publishing](https://agilitycms.com/docs/editors/preview-and-publishing) silent) | A behavior change that can publish more than an editor intends: what counts as nested vs shared, the opt-out, bulk publish from a list, Web Studio, and whether API/MCP publishes follow the same rule | Editors, developers | **P1** |
| **Batch publishing (multi-select publish), background task progress, Batch API** | Changelog 2026-09-25 (1675: "Batch Publishing" March 6 2026, "Background Task Progress" March 12 2026); pricing page "Batch Publishing"; Management API `Batch` tag (7 ops: create, status, approve, decline, publish, unpublish, request-approval) | **partial**: [batch-content-publishing](https://agilitycms.com/docs/editors/batch-content-publishing) (278 words) describes the older "select an Existing Batch or Create a New one" flow; [publish-multiple-pages](https://agilitycms.com/docs/editors/publish-multiple-pages) is 74 words; Batch API appears only inside SDK reference pages | The current multi-select flow; progress indicator; how batches interact with approvals and scheduling; a conceptual Batch API page (lifecycle, polling batch status, partial failures) | Editors, developers | **P1** |
| Reports: export of Ready to Publish and Recent Changes; Access Report | Changelog 2024-12-05 ("Export from Reports"), 2025-01-15 (Access Report filter); Productboard "New Report: Access Report" (Launched) | **partial**: [accessing-reports](https://agilitycms.com/docs/owners-admins/accessing-reports) covers Recent Changes only | Export, Ready to Publish, Access Report (who can see what) | Admins | P3 |
| **Favorites** | Changelog 2025-04-10 ("Favorites": pages, content, models and more) | **none** | Where to star items and where favorites appear | Editors | P2 |
| Next/previous item navigation; page picker search; sync status indicator incl. preview syncs | Changelog 2025-01-23, 2026-09-23 (two items) | **none** | Small, but each answers a "how do I" support question. Fold into one "Work faster in Agility" page | Editors | P3 |
| **New navigation, rail panel, refreshed side panels, 98 redesigned modals** | Changelog 2026-05-01, 2026-06-29, 2026-08-04, 2026-08-27, 2026-09-28 | **stale**: 72 UI-facing Editor, Owners/Admins and editor-track Training Guide articles carry screenshots; at most 8 have a screenshot whose filename dates from Aug 2026 or later. [scheduling](https://agilitycms.com/docs/editors/scheduling) and [how-to-test-url-redirections](https://agilitycms.com/docs/editors/how-to-test-url-redirections) still say "slide-out", now converted to modals | Screenshot and wording refresh, starting with [content-editor-navigation](https://agilitycms.com/docs/training-guide/content-editor-navigation) and [plenum-ui](https://agilitycms.com/docs/overview/plenum-ui) | Editors | **P1** |
| Rich text editor upgrade (power paste from Word, in-editor image editing) | Changelog 2024-12-05 | **mention**: [rich-text-editor](https://agilitycms.com/docs/editors/rich-text-editor) notes paste formatting only | In-editor image editing; what is stripped on paste | Editors | P3 |

### Localization

| Feature | Evidence | Docs coverage | What's missing | Audience | Pri |
|---|---|---|---|---|---|
| **Bulk copy to other locales: whole locale, page with its content, content-browser selection, single field** | Changelog 1675 ("Released May 2026"); pricing "Multilingual Content: manage, copy, and share content across languages" | **partial**: [copying-and-translating-content](https://agilitycms.com/docs/editors/copying-and-translating-content) covers Save & Localize, Bulk Copy to Locale(s), Other Locales column | Copying a **whole locale** and a **single field** are not described; background-job behavior | Editors | **P2** |
| Copy or translate a page into several locales at once | Changelog 2026-09-23 | **mention** ([locales](https://agilitycms.com/docs/editors/locales), 1 line) | Steps in the page-copy flow | Editors | P2 |
| Translation and Initialize APIs (translation batch, initialization batch for content, lists, pages) | Management API tags `Translation` (3 ops) and `Initialize` (3 ops) | **partial**: only [Management SDK .NET: Localization](https://agilitycms.com/docs/dotNet/management-sdk-dotnet-localization); nothing in JS SDK docs or conceptual docs | "Copy and translate content across locales with the API": initialize vs translate, batch status, pairing with MCP agents | Developers | P2 |

### Assets and images

| Feature | Evidence | Docs coverage | What's missing | Audience | Pri |
|---|---|---|---|---|---|
| **Where Used for assets; delete prompt that blocks in-use assets until confirmed** | Changelog 2026-09-28 (release 1693) | **none** (0 articles) | Where to see usage, what it counts (fields and embedded content, latest saved), the "too many results" case, the new delete confirmation. Belongs in [introduction-to-assets](https://agilitycms.com/docs/editors/introduction-to-assets) and [deletions-and-restorations](https://agilitycms.com/docs/editors/deletions-and-restorations) | Editors | **P1** |
| Image focal point, Fastly image optimization, AVIF | Changelog 2025-05-15 (release 1272); pricing "Real-time Image Transformations" | **partial**: [transforming-images-using-query-strings](https://agilitycms.com/docs/editors/transforming-images-using-query-strings) (880 words) lists 5 Agility params, then links out to Fastly for 26 more | Limits (input size, output dimensions, formats), worked examples, SVG and GIF behavior, which instances are on Fastly (the changelog says customers "NOT using Fastly will not be affected", the docs never say how to tell). It also sits in the Editors section despite being developer reference | Developers | **P1** |
| WebP as a default allowed image type | Changelog 1675 (Oct 28 2025) | **none** ([fields](https://agilitycms.com/docs/developers/fields) mentions "Valid File Types" but no defaults) | Default allowed types per image/file field | Developers | P3 |
| Bynder transformation parameters on pick | Changelog 1675 (July 29 2025) | **mention** ([bynder](https://agilitycms.com/docs/apps/bynder) one bullet) | What is stored in the field and how to render it | Developers | P3 |
| Custom API domain | Pricing page ("Use your domain to access the content APIs", Enterprise) | **none** (0 articles; [custom-asset-domains](https://agilitycms.com/docs/developers/custom-asset-domains) covers assets only) | What it is, how to request it, effect on SDK base URLs, CSP | Developers, admins | P2 |

### Web Studio, preview and modeling

| Feature | Evidence | Docs coverage | What's missing | Audience | Pri |
|---|---|---|---|---|---|
| **Web Studio SDK on frameworks other than Next.js** | Changelog 2024-10-30 (Web Studio GA), 2024-11-12 (CSP check), 2025-01-23 ("fields that cannot be updated live"); [product/web-studio](https://agilitycms.com/product/web-studio); Productboard "Web Studio" (Launched) | **partial**: [overview/web-studio](https://agilitycms.com/docs/overview/web-studio) (600 words, SDK levels and CSP), [previewing-in-web-studio](https://agilitycms.com/docs/editors/previewing-in-web-studio), [agility-decorate](https://agilitycms.com/docs/developers/agility-decorate) (Next.js only). None of the Nuxt, Astro, SvelteKit, Angular, Eleventy or .NET sections mention Web Studio | Per-framework setup (script tag, `data-agility-*` attributes, preview route), which fields update live vs need Save, troubleshooting (iframe, CSP, auth, mixed content) | Developers | **P1** |
| Markdown field type | Productboard "Markdown Editor (FieldType)" (Launched); this docs instance's own `DocArticle.markdownContent` field | **none**: [fields](https://agilitycms.com/docs/developers/fields) lists 17 field types and no Markdown field | Add to the field reference, with API output and when to choose it over HTML | Developers, architects | P2 |
| Model rename/delete forces a model resync | Changelog 2025-03-19 | **mention** (CLI article only) | Warning in [content-models](https://agilitycms.com/docs/developers/content-models): what breaks on rename, what resync means | Developers | P3 |
| Page model saves replace zones (API and MCP) | Changelog 2026-09-29 (release 1708) | **partial**: [.NET Pages](https://agilitycms.com/docs/dotNet/management-sdk-dotnet-pages) covers it in depth; [JS SDK pages](https://agilitycms.com/docs/javascript/management-sdk-pages) and the [MCP article](https://agilitycms.com/docs/developers/agility-cms-mcp-server) do not (the MCP article still lists 27 tools and omits `save_page_model`; already in plan A0, still unfixed in the published Markdown today) | One "zones are replaced, not merged" note in JS SDK and MCP docs | Developers | P2 |

### Developer platform

| Feature | Evidence | Docs coverage | What's missing | Audience | Pri |
|---|---|---|---|---|---|
| **Content Sync API / SDK** | Marketing headline on /product/enterprise ("Content Sync for performance and a fully decoupled architecture"), /about-agility-cms/extendability, pricing; Fetch API `Sync` tag; Productboard "Sync API" (Launched) | **partial**: [content-sync-api](https://agilitycms.com/docs/developers/content-sync-api) is 380 words; [content-sync-js-sdk](https://agilitycms.com/docs/javascript/content-sync-js-sdk) | When to choose Sync vs Fetch vs GraphQL, sync token lifecycle, storage adapters, webhook-triggered incremental sync, full re-sync and recovery | Developers, architects | **P2** |
| Fetch API status codes and cache behavior | Changelog 2023-08-18 (400 on filter errors; 408 cached 30 s), 2024-07-12 (empty lists return empty, not 404) | **partial**: [content-fetch-api](https://agilitycms.com/docs/developers/content-fetch-api) covers 429 and 408 only | A status-code and caching reference | Developers | P3 |
| `fetch-api-status` (sync status) and `types` (enum catalog) endpoints | Management API tags `Instance`, `Types` | **mention** (SDK pages only) | Two short conceptual notes: polling publish/sync completion, discovering enum values | Developers | P3 |
| Signed webhooks, retries, delivery history | Changelog 2026-09-09 (release 1636); Management API `WebHook` (history, rotate-secret) | **full** ([webhooks](https://agilitycms.com/docs/developers/webhooks), [verifying-signed-webhooks](https://agilitycms.com/docs/developers/verifying-signed-webhooks), [admin-webhooks](https://agilitycms.com/docs/training-guide/admin-webhooks)) | Reference gaps only, see Question 1 | Developers | (Q1) |
| Personal Access Tokens, CLI 1.0 (sync/push/pull, preflight, redirects, CI token auth), Management SDK .NET 2.0, MCP server GA, data regions incl. USA East, notifications (email, sound) | Changelog 1675, 1629, 1619, 1710 | **full** | Nothing material | | |

### Admin, security and marketing claims

| Feature | Evidence | Docs coverage | What's missing | Audience | Pri |
|---|---|---|---|---|---|
| **GDPR compliance** | Pricing "GDPR Compliance"; site footer `/gdpr` | **none** (only YouTube and Vimeo app privacy notes) | A short admin page: DPA, sub-processors, data subject requests, where personal data lives (users, comments, form apps). Link the legal page | Admins, evaluators | **P2** |
| **Backups: "Point-in-time backup and recovery for 30 days"** | Pricing page (Essentials and Enterprise) | **partial and inconsistent**: [disaster-recovery-and-business-continuity](https://agilitycms.com/docs/owners-admins/disaster-recovery-and-business-continuity) says retention details are "available on request (including under NDA)" | Align the docs with the published 30-day claim, or soften the claim | Admins, evaluators | **P2** |
| Built-in roles and custom roles | /product/enterprise ("nine built-in roles"); pricing "Custom Roles", "Teams" | **partial**: [user-permissions](https://agilitycms.com/docs/owners-admins/user-permissions) lists 10 roles (None through Admins) as prose; no role-by-action matrix | A permission matrix; reconcile "nine" vs ten | Admins | P2 |
| PCI statement; status page | /security ("Content Manager is declared to be PCI Compliant"; System Status link) | **mention** (1 article each) | One line each in [hosting-security-and-compliance](https://agilitycms.com/docs/owners-admins/hosting-security-and-compliance) | Admins | P3 |
| **"Content Analytics"** | /product/features (Marketing Features list) | **none as a feature**: closest are the [Google Analytics app](https://agilitycms.com/docs/apps/google-analytics) and [PostHog app](https://agilitycms.com/docs/apps/posthog) | Say what "Content Analytics" means (app-based analytics in the page sidebar) or rename the claim | Marketers, evaluators | P2 |
| Marketed integrations with no docs page | [partners/integrations](https://agilitycms.com/partners/integrations): **ai12z**, **Conscia** (0 doc hits), **Shopify** (docs only via the Next.js commerce starter) | **none** | One page each, or remove the listing | Developers | P3 |

### API operation groups with no conceptual doc

| Spec | Group (ops) | Conceptual coverage |
|---|---|---|
| Management | Batch (7) | SDK reference only; no lifecycle page (see Batch row above) |
| Management | Translation (3), Initialize (3) | .NET SDK only |
| Management | Instance `fetch-api-status` (1), Types (1) | JS SDK mention only |
| Management | Locale (6), WebHook (6), InstanceUser (3), Personal Access Tokens (5), UrlRedirection (4), Asset (15) | Covered by SDK pages plus editor/admin articles |
| Fetch | ContentModels, Gallery, Item, List, Page, Sitemap, Sync, UrlRedirection | Covered by [content-fetch-api](https://agilitycms.com/docs/developers/content-fetch-api) and SDK pages; Sync is thin (above) |

There are no comment or history endpoints in either spec, so neither is a docs gap.

---

## Question 1: what competitors document, within our feature set

Only areas where the competitor capability has an Agility equivalent are listed. Areas that prior research already covers well are summarized in the last table.

### Assets and images

| What competitors have | What we have | Gap | Suggested article | Pri |
|---|---|---|---|---|
| A self-contained transformation reference with **limits**: [Contentstack Image Delivery API](https://www.contentstack.com/docs/developers/apis/image-delivery-api) (50 MB input, 12,000 px input, 8,192 px output, AVIF capped at 4,096 px, per-parameter examples); [Sanity image URLs](https://www.sanity.io/docs/apis-and-sdks/image-urls) (every param with ranges, formats, GIF megapixel cap); [Storyblok Image Service](https://www.storyblok.com/docs/api/image-service) (per-operation pages, "GIF: only resizing is supported", protected images) | [transforming-images-using-query-strings](https://agilitycms.com/docs/editors/transforming-images-using-query-strings) lists `w`, `h`, `c`, `q`, `format=auto`, then 26 links to Fastly's own docs; [image-best-practices](https://agilitycms.com/docs/overview/image-best-practices) | No limits, no examples per parameter, no format matrix; GIF/SVG behavior wrong or missing (see flags) | **Image transformation reference** (Developers): Agility params plus the Fastly params we support, ranges, limits, format support, examples, `c` vs `fit` interplay | P1 |
| Asset concept page with accepted MIME types, private/protected assets and regional CDN hosts: [Storyblok assets](https://www.storyblok.com/docs/concepts/assets) | [introduction-to-assets](https://agilitycms.com/docs/editors/introduction-to-assets), [custom-asset-domains](https://agilitycms.com/docs/developers/custom-asset-domains), [secure-files-aws](https://agilitycms.com/docs/apps/secure-files-aws) | Upload limits, allowed types, asset URL hosts per region, Where Used | Fold into "Assets for developers" plus the Where Used update above | P2 |

### Webhooks

| What competitors have | What we have | Gap | Suggested article | Pri |
|---|---|---|---|---|
| Event catalog with a **sample payload per event**: [Strapi](https://docs.strapi.io/cms/backend-customization/webhooks) (entry, media, workflow and release events, headers table); [Storyblok](https://www.storyblok.com/docs/concepts/webhooks) (stories, assets, workflows, releases, plus IP allowlist per region and a troubleshooting section) | [webhooks](https://agilitycms.com/docs/developers/webhooks) has "Payload Details" for page and content events | No per-event payload for unpublish/delete variants; no headers table | **Webhook event and payload reference** | P2 |
| Operational specifics: [Hygraph](https://hygraph.com/docs/api-reference/basics/webhooks) (5 attempts, 3 s timeout, 7-day logs); [Sanity](https://www.sanity.io/docs/content-lake/webhooks) (`idempotency-key` header, retry on 429/5xx only, 30 s timeout, published egress IP list) | Signing, retries (1 to 8, three back-off speeds), 90-day history: all documented | Request timeout, which status codes trigger retry, egress IPs for firewall rules, the 30-second duplicate-collapse window as an idempotency guide | Add an "Operational details" section to the reference above | P2 |

### Web Studio, visual editing and preview

| What competitors have | What we have | Gap | Suggested article | Pri |
|---|---|---|---|---|
| One visual-editing guide **per framework**: [Sanity](https://www.sanity.io/docs/visual-editing/introduction-to-visual-editing) (Next.js App and Pages Router, Remix, Astro, SvelteKit, Nuxt, React Native), plus architecture, overlays, draft mode, drag-and-drop and Vercel protection-bypass pages; [Contentstack Live Preview](https://www.contentstack.com/docs/developers/set-up-live-preview) (six guides by rendering mode: CSR/SSR x REST/GraphQL, Gatsby, SSG) | Web Studio overview, preview setup ([setting-up-preview](https://agilitycms.com/docs/developers/setting-up-preview), 1,477 words), Next.js [preview-url-lifecycle](https://agilitycms.com/docs/nextjs/preview-url-lifecycle), Decorate (Next.js) | Only Next.js gets click-to-edit guidance; no troubleshooting page; no "protected preview deployments" (Vercel/Netlify password) guidance | **Web Studio setup: Nuxt / Astro / SvelteKit / Angular / .NET** (one page each, same template) and **Web Studio troubleshooting** | P1 |

### Content modeling

| What competitors have | What we have | Gap | Suggested article | Pri |
|---|---|---|---|---|
| Field-type reference with **API output per type**: [Hygraph field types](https://hygraph.com/docs/api-reference/schema/field-types) (GraphQL type and example response for each, field visibility modes); [Storyblok fields](https://www.storyblok.com/docs/concepts/fields) (16 types, options, JSON output, link object shape, "API returns UTC") | [fields](https://agilitycms.com/docs/developers/fields) (1,320 words): UI options and validation per type | No JSON shape per field in Fetch/GraphQL responses (linked content, gallery, image, date timezone, dropdown); Markdown field missing | **Field type reference: what each field returns** | P2 |

### Localization

| What competitors have | What we have | Gap | Suggested article | Pri |
|---|---|---|---|---|
| A **strategy chooser**: [Storyblok internationalization](https://www.storyblok.com/docs/concepts/internationalization) (field-level vs folder-level vs space-level, with when-to-use); [Sanity localization](https://www.sanity.io/docs/studio/localization) (field-level vs document-level, trade-offs on publishing) | [multi-locale-guide](https://agilitycms.com/docs/developers/multi-locale-guide) (URL strategy only), [multi-locale-handling-with-sitemaps-and-pages](https://agilitycms.com/docs/editors/multi-locale-handling-with-sitemaps-and-pages), five editor locale articles | No content-side decision: locales in one instance vs locale-specific sitemaps vs instance per region, and how bulk copy, DeepL and the Translation API fit | Fold into the planned "Going multi-locale" solution guide (plan C4) as its opening decision section | P2 |

### Workflow, scheduling and roles

| What competitors have | What we have | Gap | Suggested article | Pri |
|---|---|---|---|---|
| Release mechanics with limits and conflicts: [Sanity content releases](https://www.sanity.io/docs/user-guides/content-releases) (ASAP / scheduled / undecided, 1,000 documents per release, conflict behavior); [Storyblok workflows](https://www.storyblok.com/docs/manuals/workflows) (stage permissions, auto-progress) | [scheduling](https://agilitycms.com/docs/editors/scheduling), [schedule-content-changes](https://agilitycms.com/docs/editors/schedule-content-changes), [workflows](https://agilitycms.com/docs/editors/workflows), batch docs | What happens when a scheduled item is edited again, nested content on scheduled publish, batch size limits | Covered by the batch rewrite above plus the "coordinated release" scenario already proposed in [sanity.md](sanity.md) | P2 |
| Permission scoping explained, plus **recipes by job**: [Hygraph permissions](https://hygraph.com/docs/api-reference/basics/permissions) (by model, locale, stage, environment; "Permission Combinations by Job"); [Storyblok space role object](https://www.storyblok.com/docs/api/management/space-roles/the-space-role-object) (field and folder permissions in the API) | [user-permissions](https://agilitycms.com/docs/owners-admins/user-permissions), [custom-roles](https://agilitycms.com/docs/owners-admins/custom-roles), [item-level-permissions](https://agilitycms.com/docs/owners-admins/item-level-permissions), [teams](https://agilitycms.com/docs/owners-admins/teams) | No role-by-action matrix | **Roles and permissions matrix** (recipes are already net-new #33) | P2 |

### APIs, SDKs, CLI, performance

| What competitors have | What we have | Gap | Suggested article | Pri |
|---|---|---|---|---|
| Caching concept tied to rate limits: [Storyblok caching](https://www.storyblok.com/docs/concepts/caching) (cache-version key, invalidation on publish, cached vs uncached limits, SSG advice) | [content-delivery-and-cdn-architecture](https://agilitycms.com/docs/developers/content-delivery-and-cdn-architecture), [developer-caching](https://agilitycms.com/docs/training-guide/developer-caching), Next.js caching | Status codes and their cache lifetimes; how long after publish the CDN serves new content | Fetch API status-code and caching reference (Q2 row) | P3 |
| CLI with one page per command: [Storyblok CLI](https://www.storyblok.com/docs/libraries/storyblok-cli) (31 commands incl. schema diff/rollback, migrations, type generation) | [cli](https://agilitycms.com/docs/developers/cli) (4,150 words, one page) and the CI/CD guide | Depth is fine; findability is not (a single long page) | Split flags into a per-command reference when the redesign lands | P3 |

### Already covered by prior research (no new rows)

| Area | Where it's handled |
|---|---|
| Limits and plan usage | net-new #6 (add the Fetch API "10 uncached requests per second" vs pricing "Unlimited API requests" explanation; see flags). Reference: [Sanity technical limits](https://www.sanity.io/docs/content-lake/technical-limits), [Contentful technical limits](https://www.contentful.com/developers/docs/technical-limits-legacy-2024/) |
| Multi-site / tenancy | net-new #11. New evidence: [Storyblok multi-space orchestration](https://www.storyblok.com/docs/manuals/multi-space-orchestration) documents clone/merge/overwrite between spaces; Agility's CLI already does chained multi-instance sync, so say so in that guide |
| Security and compliance | net-new #30, #31 (add the GDPR and backup items above) |
| AI / MCP | plan workstream A |
| Migration | net-new #18 to #21 |
| Analytics / A-B testing | **We lead**: [A/B/n testing](https://agilitycms.com/docs/owners-admins/a-b-n-testing-in-agility-cms) (2,521 words) and the PostHog app are deeper than [Contentstack Personalize](https://www.contentstack.com/docs/personalize/about-personalize) as fetched. Only the "Content Analytics" claim needs work |
| Search | **We lead**: Algolia, Elastic, Coveo, Azure AI Search, indexing guide. No gap found |
| Apps / extensibility | [apps-sdk](https://agilitycms.com/docs/apps/apps-sdk) (2,827 words, all surfaces). Contentful App Framework comparison failed (429) |

---

## Flags

### Marketing claims the docs never explain (credibility risk)

1. **Custom API Domain** (pricing): zero docs.
2. **GDPR Compliance** (pricing, footer): zero admin docs.
3. **30-day point-in-time backups** (pricing) vs docs "details available on request".
4. **Content Analytics** (features page): no feature by that name in the docs.
5. **"Nine built-in roles"** (enterprise page) vs ten roles listed in [user-permissions](https://agilitycms.com/docs/owners-admins/user-permissions).
6. **"Unlimited API requests"** (pricing) next to a documented 10 uncached requests per second limit ([content-fetch-api](https://agilitycms.com/docs/developers/content-fetch-api)); both are true but nothing reconciles them for a buyer.
7. **Web Studio** is a flagship on /product/web-studio, but only Next.js has click-to-edit setup docs.
8. **Integrations page** lists ai12z and Conscia with no docs.
9. Marketing-side inconsistency to pass on (not a docs fix): [/security](https://agilitycms.com/security) says static files and REST API are delivered via "Azure CDN and Stackpath CDN"; /product/enterprise, pricing and the docs say Fastly.

### Docs that describe something the changelog changed or removed

1. **Batch publishing**: [batch-content-publishing](https://agilitycms.com/docs/editors/batch-content-publishing) describes adding to an "Existing Batch"; the March 2026 release made batch publishing a multi-select action. Verify which flow is current before rewriting.
2. **Publishing scope**: every publishing article implies publish affects one item; since 2026-09-23 nested linked content publishes too by default.
3. **Slide-outs**: [scheduling](https://agilitycms.com/docs/editors/scheduling) ("Create a New Schedule from the slide-out") and [how-to-test-url-redirections](https://agilitycms.com/docs/editors/how-to-test-url-redirections) (screenshot "Redirect Test Slideout"); slide-outs were converted to modals in 2026.
4. **Navigation**: navigation and rail panel redesigned 2026-08-27; UI-tour articles predate it.
5. **SVG transforms**: [image-best-practices](https://agilitycms.com/docs/overview/image-best-practices) says SVGs are "passed through as-is, no resizing or format conversion". This repo's AGENTS.md records (2026-09-28) that `?w=` or `?format=auto` on an SVG makes the image CDN return a scrambled PNG. One of them is wrong; the customer-facing statement needs testing and correcting.
6. **Terminology**: the 2023 "Terminology Updates" release renamed Page Templates to Page Models and Modules to Components; "Page Template" still appears in 31 article bodies (plan C2 counted 20 by title/term; the body count is higher). Gatsby was removed as an automated deployment target in 2023; Gatsby Cloud articles are already in plan C1.

---

## Top 15 actions (ranked across both questions)

1. **Document "publishing now includes nested linked content" and the "Publish this item only" opt-out** across the publishing, Web Studio and bulk-publish articles: a silent behavior change that can push unreviewed content live.
2. **Add Where Used and the in-use delete confirmation to the asset docs**: shipped 2026-09-28, zero coverage, and it changes how editors delete.
3. **Write Web Studio setup guides for Nuxt, Astro, SvelteKit, Angular and .NET, plus a troubleshooting page**: flagship marketing feature; Sanity and Contentstack each ship 6 to 7 per-framework guides; we have Next.js only.
4. **Refresh UI-facing docs for the 2026 navigation, rail panel, side panels and modals** (start with navigation, plenum-ui, scheduling, redirect testing): at most 8 of 72 screenshot-bearing articles show the current UI.
5. **Rewrite batch publishing as one current article** (multi-select publish, progress indicator, approvals and scheduling interplay) and add a Batch API lifecycle page: the existing article likely describes a superseded flow.
6. **Publish an image transformation reference with limits, format support, examples and the SVG/GIF rules**, and fix the SVG contradiction: competitors publish limits; ours outsources to Fastly links and may state the wrong SVG behavior.
7. **Reconcile marketing claims with docs**: Custom API Domain, GDPR, 30-day backups, Content Analytics, nine vs ten roles, unlimited requests vs rate limit; evaluators read both.
8. **Webhook event and payload reference with operational details** (per-event payloads, headers, timeout, retryable status codes, egress IPs, 30-second dedupe): the feature is new and good; the reference is what integrators need next.
9. **Field type reference showing what each field returns in Fetch and GraphQL**, adding the undocumented Markdown field: Hygraph and Storyblok set this bar; it is the page developers keep open.
10. **Document whole-locale, single-field and multi-locale copy, plus the Translation and Initialize APIs**: May and September 2026 features with partial or SDK-only coverage.
11. **Content Sync conceptual guide** (Sync vs Fetch vs GraphQL, token lifecycle, webhook-driven incremental sync): a marketing headline backed by 380 words.
12. **Roles and permissions matrix** (role by action, with teams and item-level permissions): answers the most common admin question in one table.
13. **"Work faster in Agility" editor page**: Favorites, next/previous item, page-picker search, sync status, report export; five shipped conveniences with no docs.
14. **Fetch API status-code and caching reference** (400 filter errors, 408 with 30-second cache, 429, empty lists): cheap, and it pre-empts support tickets.
15. **Docs or delisting for ai12z and Conscia, and a Shopify page beyond the starter**: marketed integrations should resolve to a docs page.
