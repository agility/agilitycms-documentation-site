# Net-new articles: what we don't have yet

> Produced 2026-10-03 for [docs-modernization-plan-2026.md](../docs-modernization-plan-2026.md) §7. Builds on [competitor-teardown.md](../competitor-teardown.md) and the four per-site reports in this folder; ideas already covered there or in the plan are left out. Every candidate below was checked against the bodies of all 331 published articles (zero or incidental hits only, unless noted). About 35 live pages fetched; Hygraph, some Contentful pages (HTTP 429), a Kontent.ai lesson and two Sanity/Contentstack pages failed, so evidence for those comes from index pages or search results.

Two goals: docs that **educate users** (teach the model, not just the buttons) and docs that **inform evaluators** choosing a platform.

## 1. Patterns worth copying

| # | Pattern | Examples | Why it works |
|---|---|---|---|
| 1 | Teach the mental model before features | [Algolia: how it works](https://www.algolia.com/doc/guides/getting-started/how-algolia-works/) · [Supabase architecture](https://supabase.com/docs/guides/getting-started/architecture) | A vocabulary readers map every later page onto |
| 2 | Say what the product is NOT, and who it doesn't suit | Supabase ("not a 1-to-1 mapping of Firebase") · [Payload use cases](https://payloadcms.com/docs/getting-started/use-cases) | Honest scoping builds trust and pre-qualifies buyers |
| 3 | Decision guides comparing your *own* options | [Stripe integration options](https://docs.stripe.com/payments/payment-methods/integration-options) · [Shopify app surfaces](https://shopify.dev/docs/apps/build/app-surfaces) | Answers "which way should I build this?" with no legal risk |
| 4 | Production checklists by pillar, with plan badges | [Vercel production checklist](https://vercel.com/docs/production-checklist) · [Supabase going into prod](https://supabase.com/docs/guides/deployment/going-into-prod) | Scannable, and honest about plan-gated items |
| 5 | One shared-responsibility page | [Supabase](https://supabase.com/docs/guides/deployment/shared-responsibility-model) · [Stripe security guide](https://docs.stripe.com/security/guide) | We already have the content, scattered across 5 admin articles |
| 6 | Limits explained as "measure, then reduce" | [Storyblok traffic](https://www.storyblok.com/docs/concepts/traffic) · [Vercel limits](https://vercel.com/docs/limits) | Turns a support question into self-service |
| 7 | Migration hub: phased framework + per-source playbooks + agent with checkpoints | [Storyblok CMS migration](https://www.storyblok.com/docs/concepts/cms-migration) · [Prismic migration](https://prismic.io/docs/migration) · [Sanity Learn](https://www.sanity.io/learn) | Catches buyers at peak intent |
| 8 | Reference architecture center | [Cloudflare reference architecture](https://developers.cloudflare.com/reference-architecture/) | "Why this shape" separate from "how to build it" |
| 9 | Best practices as numbered rules with named mistakes | [PostHog best practices](https://posthog.com/docs/product-analytics/best-practices) | Concrete failures are memorable |
| 10 | Opinionated method and planning content | [The Linear Method](https://linear.app/method) · [Kontent.ai Learn: Plan](https://kontent.ai/learn/plan) | Teaches how to work, not just what the product does |
| 11 | Agent-native docs plumbing | [Stripe skills](https://docs.stripe.com/skills) (`npx skills add`, `.well-known/skills`) · Vercel "For AI agents: related pages" frontmatter | Stripe-level agent readiness, beyond llms.txt |
| 12 | AI docs split by audience, with data handling stated | [Strapi AI for content managers](https://docs.strapi.io/cms/ai/for-content-managers) | Answers the buyer's first AI question up front |
| 13 | Glossary terms with their own "what-is" URLs | [Twilio glossary](https://www.twilio.com/docs/glossary) · [Stripe glossary](https://docs.stripe.com/glossary) | Per-term URLs capture evaluator search traffic |

## 2. Recommended new articles

### Evaluators and buyers

| # | Title | Purpose | Inspired by | Pri |
|---|---|---|---|---|
| 1 | **Is Agility right for your project? When it fits and when it doesn't** | Honest fit and non-fit criteria: team shape, page-managed sites vs pure content APIs, owning your front end | Payload use cases; Supabase "is not" | P1 |
| 2 | **How Agility works: a 10-minute architecture tour** | One diagram, product principles, read path vs write path, what Agility is not. Evaluator-level, unlike the Training Guide deep dive | Supabase architecture; Algolia | P1 |
| 3 | **What your team builds vs what Agility provides** | Responsibility map: front end, hosting, preview route, search, forms vs CMS, CDN, workflow, MCP | Payload; Supabase shared responsibility | P1 |
| 4 | **Choosing a headless CMS: a capability checklist and questions to ask any vendor** | Vendor-neutral framework; the safe alternative to "vs" pages | Kontent.ai Plan | P1 |
| 5 | **Run a two-week proof of concept** | Scope, success criteria, what to prove, who to involve, how to score | Storyblok migration discovery; Sanity Learn | P1 |
| 6 | **Understand your plan's limits and usage** | What counts as an API call (CDN-cached responses don't), uncached rate limit, assets, users, locales; monitoring; what happens at the limit | Storyblok traffic; Vercel limits | P1 |
| 7 | Building the replatforming business case | Estimating effort: inventory, model count, integrations; phases and roles | Sanity Learn replatforming; Kontent.ai maturity | P2 |
| 8 | Headless, hybrid or traditional: choose your delivery model | Stripe-style table of Agility's own delivery options; links the traditional-site article | Stripe options; Shopify storefronts | P2 |
| 9 | Getting your content out: data portability and exit | Sync API, Management SDK, CLI, export; assets; a full export | Supabase portability | P2 |

### Architects

| # | Title | Purpose | Inspired by | Pri |
|---|---|---|---|---|
| 10 | **Reference architectures** (hub + 4 to 5 pages) | Marketing site on Next.js/Vercel; multi-brand portfolio; content hub for web and apps; headless commerce; M365/intranet with Copilot. Diagram, rationale, trade-offs, link to implementation | Cloudflare | P1 |
| 11 | **Choose your tenancy model: one instance, many sitemaps, or many instances** | Decision tree for multi-brand and multi-region; today's article lists options but doesn't decide | Stripe; Shopify | P1 |
| 12 | **Content modeling anti-patterns** | Modeling for presentation, mega-components, rich-text dumping, copying instead of linking, over-nesting, trusting the default take of 50 | PostHog; Storyblok modeling | P1 |
| 13 | Nest, link or share? Choosing how components reference content | Decision guide across nested, linked (shared vs nested) and shared content | Storyblok references vs nesting | P2 |
| 14 | Designing a taxonomy that scales | Tags vs linked lists, filter performance, governance ("taxonomy" has 0 hits today) | Storyblok datasources | P2 |
| 15 | Map your design system to component models | Atomic design, Figma naming, variant fields vs separate components | Storyblok; Builder.io | P2 |
| 16 | Structured content explained | Short primer; feeds omnichannel and AI-readiness | Kontent.ai | P3 |
| 17 | Beyond the website: apps, kiosks, email, in-app | Non-web channels via Fetch and Sync APIs | Payload; Kontent.ai | P3 |

### Developers

| # | Title | Purpose | Inspired by | Pri |
|---|---|---|---|---|
| 18 | **Migrate from WordPress to Agility** | Posts/pages/ACF to models, Gutenberg HTML to fields, media, permalinks to redirects. Pairs with the staged AI-migration guide | Prismic; Storyblok per-source | P1 |
| 19 | Migrate from Contentful / from Sitecore (two pages) | Locale mapping, references, rich text; Sitecore presentation to page models. Factual, export-API-based | Storyblok | P2 |
| 20 | **Cutover runbook: content freeze, DNS, redirects, rollback** | Launch-day sequence; today's checklist is pre-launch only | Storyblok phases 8 to 10; Vercel | P1 |
| 21 | Keep your rankings through a migration | URL inventory, redirect map incl. assets, canonicals, sitemap diff, IndexNow | Storyblok SEO phase | P2 |
| 22 | Handle rate limits and outages gracefully | Cache first, backoff, stale-while-revalidate, Sync API fallback, status page | Contentful limits; Stripe | P2 |
| 23 | **Content Security Policy and network allowlist** | Exact CSP directives for Fetch API, asset CDN, Web Studio iframe, Apps SDK; firewall domains | Stripe security guide | P1 |
| 24 | Test your Agility integration in CI | Model contract tests, preview-route tests | Sanity Learn | P3 |

### Editors and marketers

| # | Title | Purpose | Inspired by | Pri |
|---|---|---|---|---|
| 25 | A content operations playbook | Roles, stages, a weekly publishing rhythm | Linear Method; Sanity Learn | P2 |
| 26 | Writing for structured content | Field-level guidance: summaries, SEO fields, alt text, no layout in rich text | Kontent.ai | P2 |
| 27 | Accessible content checklist for editors | Alt text, heading order, link text, captions (WCAG has 0 hits) | Vercel/Supabase checklist format | P2 |
| 28 | Plan an editorial calendar with scheduling and approvals | Calendar practice over existing features | Kontent.ai Learn | P3 |
| 29 | Measure what you publish | Analytics and A/B results into editorial decisions | PostHog | P3 |

### Admins, IT and security

| # | Title | Purpose | Inspired by | Pri |
|---|---|---|---|---|
| 30 | **The Agility shared responsibility model** | Consolidate 5 existing "Shared responsibilities" sections into one page and diagram | Supabase | P1 |
| 31 | **Security review pack: answering your vendor questionnaire** | Maps SIG/CAIQ-style sections to existing docs; links the trust process | Contentstack trust center | P1 |
| 32 | Admin go-live checklist | SSO, MFA, roles, key scoping, audit logs, webhook secrets, offboarding | Vercel security pillar | P2 |
| 33 | Role design recipes: agencies, regional teams, freelancers | Least-privilege with custom roles and item permissions | Storyblok roles | P2 |
| 34 | User lifecycle at scale: provisioning, offboarding, access reviews | Document what's supported (SCIM has 0 hits) and the recommended pattern | Storyblok SSO/SCIM | P2 |

### AI and agents

| # | Title | Purpose | Inspired by | Pri |
|---|---|---|---|---|
| 35 | **What happens to your data when you use AI with Agility** | What the MCP server sends, stores, retains; training; region. Distinct from access governance | Strapi | P1 |
| 36 | **Install Agility skills for your coding agent** | Publish an Agility skill pack (modeling rules, take:250, reference-name case, staging-not-live) with `npx skills add` and `.well-known/skills` | Stripe skills | P1 |
| 37 | **How to write good requests to an AI assistant in Agility** | The underlying skill behind the recipes: name the content, scope, suggest vs act | Kontent.ai "write clear prompts" | P1 |
| 38 | When to use AI, and when not to | Bulk SEO yes, legal copy no, publishing always human-gated | Kontent.ai | P2 |
| 39 | Make your content model agent-friendly | Field descriptions, naming, validation as instructions for agents | Sanity agent context | P2 |
| 40 | Evaluate Agility with an AI agent in 30 minutes | Trial, connect MCP, build a model and page by prompt | Stripe agent quickstart | P3 |

**Restructure, not net-new:** rebuild the Website Deployment Checklist on Vercel's five pillars with plan badges; add "For AI agents: related pages" frontmatter to the `.md` twins.

## 3. Top 10 to write first

1. **#3 What your team builds vs what Agility provides.** The most common headless surprise; it costs deals and causes bad implementations.
2. **#1 Is Agility right for your project?** Honest fit criteria make every other claim more credible.
3. **#35 What happens to your data when you use AI.** The MCP article is the most-read page; enterprise buyers block it until this is answered.
4. **#18 Migrate from WordPress.** Highest-volume replatform source, at peak buyer intent.
5. **#20 Cutover runbook.** Launch day is where projects fail; nothing covers freeze or rollback.
6. **#12 Content modeling anti-patterns.** Fixes the mistakes behind most support tickets.
7. **#11 Choose your tenancy model.** Multi-site is a top-5 use case and today's docs don't help anyone decide.
8. **#30 Shared responsibility model.** Cheap: the content exists in five places already.
9. **#6 Plan limits and usage.** Self-service for a recurring support question.
10. **#36 Agility skills for coding agents.** Stripe-level agent readiness, reusing this repo's own skill content.

## 4. Sensitive items

- **No "Agility vs X" pages in the docs.** Competitors keep those on marketing paths, and they go stale (Sanity's now lives at a `-legacy` URL). Risks: outdated feature or pricing claims, trademark use, misleading-advertising exposure. Use capability-based guides (#4, #8) instead; any named comparison belongs on the marketing site with a date stamp, sources, legal review and a review cadence.
- **"Migrate from X" is fine** when it sticks to X's export API and data model, carries a "last verified" date, and passes no judgment.
- **Limits and pricing (#6):** numbers from product/billing only, matching contracts; link to pricing rather than restating it.
- **Security and AI data claims (#30, #31, #35) are effectively contractual.** Security and legal sign-off; no absolutes; certifications on one canonical page.
- **"When it's not a fit" (#1)** needs product-marketing agreement; keep it about project shape, not competitors.
- **Capability-dependent pages (#23, #34, #36):** confirm the product supports it first; otherwise document the supported workaround.
