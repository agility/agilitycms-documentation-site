# Docs execution plan, Q4 2026

Joel approved every recommendation in [content-suggestions/net-new-articles-2026.md](content-suggestions/net-new-articles-2026.md) and [content-suggestions/feature-coverage-gaps-2026.md](content-suggestions/feature-coverage-gaps-2026.md) on 2026-10-03. This file turns them into tracked work. The strategy and the reasoning live in [docs-modernization-plan-2026.md](docs-modernization-plan-2026.md); this is the work breakdown.

**Rules for every item** (from the modernization plan, §9 decision 4):

- Everything is saved to **Staging**. A named person reviews and publishes. Nothing goes live from this plan without that.
- A fact goes into an article only if it can be checked against a source: the developer changelog, the OpenAPI snapshots in `lib/api-specs/snapshots/`, a live call to this docs instance's own Fetch API, a published package, or an existing article that is itself verified. Anything else goes into the item's `NoteInternal` as a question, and the article either leaves it out or says less.
- Security, AI data handling, limits and pricing statements are effectively contractual (net-new §4). Those articles are drafted as **review drafts**: the facts we can verify, plus a visible list of questions for product, security or legal. They are not ready to publish until those questions are answered.
- One agent owns an article at a time. Tracks below list the articles they own, so parallel work never edits the same item.
- No em dashes in new text.

**Changed by the 2026-10-03 framework decision:** gap action 3 ("Web Studio guides for Nuxt, Astro, SvelteKit, Angular") is replaced by one framework-agnostic Web Studio setup guide, a .NET guide and a troubleshooting page, because those four frameworks are now archived (Nuxt is "outdated").

## Wave 1: fix what the product changed, and the reference pages developers keep open

Highest harm first. All facts come from the changelog, the API specs or the live API.

| Track | Work | Source items | Owns | Status |
|---|---|---|---|---|
| **W1-A Publishing** | Publishing now includes nested linked content by default, and the "Publish this item only" opt-out, in every publishing, Web Studio and bulk-publish article. Rewrite batch publishing as one current article (multi-select, progress, approvals, scheduling). New Batch API lifecycle page. Fix "slide-out" wording in scheduling. | Gap 1, 5; flags 1-3 | Publishing, scheduling, batch, workflow articles | |
| **W1-B Assets and images** | Where Used and the in-use delete confirmation in the asset articles (1697 already staged). Image transformation reference: parameters, formats (AVIF, WebP), focal point, limits we can verify, GIF and SVG rules. Correct the SVG statement in image-best-practices: `?format=auto` alone passes an SVG through, `?w=` rasterizes it (measured 2026-10-03). | Gap 2, 6; flag 5 | Asset and image articles | |
| **W1-C Developer reference** | Fetch API status codes and caching (400 filter errors, 408 cached 30 s, 429, empty lists). Field type reference showing what every field type returns in Fetch and GraphQL, including the Markdown field, from live calls. Content Sync concept guide (Sync vs Fetch vs GraphQL, token lifecycle, webhook-driven incremental sync). | Gap 9, 11, 14 | New reference articles; content-fetch-api | |
| **W1-D Webhooks** | Webhook event and payload reference: per-event payloads, headers, timeout, retryable status codes, delivery history, secret rotation, dedupe. | Gap 8 | Webhook articles | |
| **W1-E Localization** | Whole-locale, page, selection and single-field copy; multi-locale copy and translate; Translation and Initialize APIs; a strategy chooser (field vs page vs instance localization). | Gap 10 | Localization articles | |
| **W1-F Editor productivity and UI prose** | "Work faster in Agility" (Favorites, next/previous item, page-picker search, sync status, report export, Access Report). Prose (no screenshots) for the 2026 navigation, rail panel, side panels and modals, starting with navigation, plenum-ui and redirect testing. | Gap 4, 13 | Navigation, UI tour, reports, redirect-testing articles | |
| **W1-G Web Studio** | Framework-agnostic Web Studio setup (script + `data-agility-*` attributes + preview route), a .NET guide, and a troubleshooting page (CSP check, fields that can't update live). | Gap 3 (revised) | Web Studio articles outside /nextjs | |
| **W1-H Roles** | Roles and permissions matrix (role by action, teams, item-level permissions). Role design recipes for agencies, regional teams and freelancers (#33). Flags the "nine vs ten roles" mismatch for marketing. | Gap 12; #33 | user-permissions and role articles | |

## Wave 2: evaluator, architect and migration content

Writable from existing docs and product knowledge in the repo. New sections where needed (confirm container names with `get_containers`).

| Track | Articles | Section |
|---|---|---|
| **W2-A Evaluate** | #3 What your team builds vs what Agility provides; #2 How Agility works (architecture tour); #1 Is Agility right for your project (review draft: product marketing signs off on fit criteria); #4 Capability checklist and questions to ask any vendor; #5 Two-week proof of concept; #8 Headless, hybrid or traditional; #9 Data portability and exit; #7 Replatforming business case; #40 Evaluate Agility with an AI agent in 30 minutes | New "Evaluating Agility" section |
| **W2-B Architecture** | #10 Reference architectures hub + 4 to 5 pages (marketing site, multi-brand, commerce, intranet/member, multi-channel); #11 Choose your tenancy model; #22 Handle rate limits and outages; #23 Content Security Policy and network allowlist (hosts verified from live responses) | Developers / architecture |
| **W2-C Modeling** | #12 Content modeling anti-patterns; #13 Nest, link or share; #14 Taxonomy that scales; #15 Map your design system to component models; #16 Structured content explained; #17 Beyond the website; #39 Make your content model agent-friendly | Content modeling |
| **W2-D Migration** | Migration hub; #18 Migrate from WordPress; #19 Migrate from Contentful, from Sitecore (export APIs only, no judgments, "last verified" date); #20 Cutover runbook; #21 Keep your rankings through a migration; links 1728 (migrating with an AI agent) | New "Migrating to Agility" section |

## Wave 3: review drafts that need product, security or legal answers

Drafted with every verifiable fact and an explicit question list. Not publishable until answered.

| Track | Articles | Blocking questions go to |
|---|---|---|
| **W3-A Trust** | #30 Shared responsibility model; #31 Security review pack; #35 What happens to your data when you use AI (plan §9 decision 7); #32 Admin go-live checklist; #34 User lifecycle at scale | Security, legal, product |
| **W3-B Limits** | #6 Understand your plan's limits and usage, reconciling "unlimited API requests" with the 10 uncached requests per second limit; numbers only from billing | Product, billing |
| **W3-C Marketing claims** | One questions document for product marketing: Custom API Domain, GDPR, 30-day backups, Content Analytics, nine vs ten roles, unlimited requests, CDN naming on /security, ai12z and Conscia (document or delist), Shopify beyond the archived starter | Product marketing |
| **W3-D Agent skills** | #36 Install Agility skills for your coding agent: confirm where skills are published before documenting an install command (never a package name that doesn't exist) | Product |

## Wave 4: content operations and AI practice

| Track | Articles |
|---|---|
| **W4-A Content ops** | #25 Content operations playbook; #26 Writing for structured content; #27 Accessible content checklist; #28 Editorial calendar with scheduling and approvals; #29 Measure what you publish |
| **W4-B AI practice** | #37 Writing good requests to an AI assistant in Agility; #38 When to use AI and when not to |
| **W4-C Developer quality** | #24 Test your Agility integration in CI; one page per CLI command (gap: Storyblok has 31) |

## Wave 5: site features and sweeps (code in this repo)

| Track | Work |
|---|---|
| **W5-A Glossary** | Per-term URLs (`/docs/glossary/<term>`) generated from a glossary content list, with `DefinedTerm` structured data. Pattern 13. |
| **W5-B Agent plumbing** | "Related pages for agents" in each `.md` twin and `llms.txt` sections per audience. Pattern 11. Measured by `docs_agent_request`. |
| **W5-C Terminology sweep** | "Page Template" to "Page Model" and "Module" to "Component" in the 31 article bodies, run alone after Waves 1 to 4 so it never collides with another track. |
| **W5-D Drift checks** | Run the api-spec-drift skill against everything Waves 1 to 4 touched. |

## Order and capacity

Waves run in order, tracks within a wave run in parallel. Each track reports a table of content IDs, what changed, and what it could not verify; those reports update the Status column here and the Progress table in the modernization plan. Publishing stays with Joel or a named reviewer, in this order: Wave 1 first (it corrects live behavior), then sections together with their articles.

## Log

| Date | Entry |
|---|---|
| 2026-10-03 | Plan written. Wave 1 started. |
| 2026-10-03 | Framework decision applied: 1736 "Why We Recommend Next.js and .NET" staged; 250, 114, 445, 280, 446, 1346, 1364 now recommend Next.js or .NET and link 1736 and the Vibe Coding section. **Publish chain:** section 1729 and 1730 to 1735, then 1736, then those seven. Leftovers for W5-C: 446 still links the archived Next.js AWS guides; 445's Next.js Commerce section describes the archived starter; 1348 and 257 (ClassicContent) still show Gatsby install lines. |
