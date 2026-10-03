# Docs Modernization Plan: every article

**Status:** In progress (see Progress below), awaiting decisions in §9 · **Owner:** Joel Varty · **Audit date:** 2026-10-03
**Scope:** all 16 article containers in instance `67bc73e6-u`. Framework, SDK and API work is already tracked in [content-refresh-plan-2026.md](content-refresh-plan-2026.md); this plan covers everything else, adds an **AI & MCP track**, and only touches framework docs where a finding cuts across categories.
**Out of scope for now:** recapturing UI screenshots (decision 2026-10-03). Diagrams are in scope.

---

## 1. The short version

| | |
|---|---|
| Articles in the CMS | **360** (325 published, 11 staging, 24 unpublished) |
| Published words | ~251,000 across 331 articles in `llms.txt` |
| Published articles written in 2021 or 2022 with **no real edit since 2024** | **109** |
| Images referenced | 654 unique: 621 raster, 21 SVG, 11 unreachable |
| Diagrams trapped in PNG (light-only, unsearchable, blurry) | **20**, three of them reused across 5 to 8 articles each |
| Existing SVGs that break the site's own dual-theme rule | **9 of 21** |
| Articles mainly about AI or MCP | **3** (plus 2 app-building posts). Zero for editors, zero for admins |
| Most-read article on the site (last 90 days) | **Agility CMS MCP Server** |

Three conclusions drive the plan:

1. **AI and MCP is the biggest gap and the biggest demand.** The MCP article is the most-read article on the site, yet the whole topic lives in three developer articles, and that reference has already drifted (§4).
2. **Most of the corpus is 2021 vintage that only *looks* recently edited.** 235 items carry bulk-touch `lastModified` stamps (12 batch edits, e.g. 2026-09-18 16:30 to 16:32). Content dates are not a freshness signal here; the audit used `createdDate` plus content checks.
3. **Diagrams are few but high-leverage.** Redrawing 3 Training Guide diagrams fixes 8 articles. A worked example is already in the repo (§5.1).

## Progress (2026-10-03)

Code ships in this PR. Every CMS change is saved to **Staging only**: nothing is live until a named person reviews and publishes it (§9 decision 4).

| Item | Where | State |
|---|---|---|
| `.md` twins: image links with spaces/parentheses no longer vanish (69 articles) | `lib/cms-content/articleMarkdown.ts` | ✅ code, tested |
| `llms.txt`: no `.md` links for landing pages (the `/javascript/management-sdk.md` 404) | `app/llms.txt/route.ts` | ✅ code |
| Archive `/developers/gatsby-cloud` | `lib/docs/legacyFrameworks.ts` | ✅ code, tested |
| MCP server article: 32 tools, publish/unpublish tools, current install steps for Claude, Copilot, Cursor, Windsurf, Antigravity, ChatGPT; **removed `npx -y agility-mcp-server`, a package that does not exist on npm** (a squattable name) | 1287 | Staging |
| Gatsby Cloud removed from Deployment & Code Repositories | 446 | Staging |
| Editor AI section + "Using AI Assistants" + 3 recipes (SEO metadata, translation, content audit) | 1720, 1722, 1724–1726 | Staging |
| Governing AI Access (admins) | 1727 | Staging |
| Migrating Content with an AI Agent | 1728 | Staging |
| Building Sites with AI Coding Tools; Making Your Site Readable by AI | 1721, 1723 | Staging |
| Training Guide: 3 diagrams redrawn as dual-theme SVG and swapped into 8 articles, captions updated | 1325, 1327, 1337, 1338, 1346, 1347, 1357, 1358 | Staging |
| Concept diagrams (workflow, page structure, linked content ×2) and the 9 light-only SVGs (`-v2`) | see PR | Staging |
| Net-new article research (40 ideas) | [content-suggestions/net-new-articles-2026.md](content-suggestions/net-new-articles-2026.md) | ✅ §7 |

**Not a problem after all:** the Blazor "broken image" is sample markup inside a code block. The `/owners-admins/null` hits don't come from any article, section, landing page or code path; most likely an old link or an off-site referrer. Watch it in PostHog rather than chase it.

**New finding, needs a decision (§9, decision 6):** the published Next.js articles #480 (*How the Next.js Starter Works*) and #985 (*Caching*) say the starter uses Cache Components (`cacheComponents`, `"use cache"`, `cacheTag`). The public starter ([agility/agilitycms-nextjs-starter](https://github.com/agility/agilitycms-nextjs-starter), `main`, Next 16.0.7, last commit 2025-12-15) uses none of them: it caches with fetch tags and `revalidate: 60`. A developer who clones the starter and follows #480 finds different code. The new article 1721 was corrected to describe the starter as it is.

---

## 2. How this was measured

All read-only. Nothing was saved or published.

- **Content:** every article's `.md` twin from `/docs/llms.txt` (330 of 331 fetched; the one 404 is itself a finding).
- **Dates and state:** all 16 `*Articles` containers via the Agility MCP. Bulk touches were detected as 8+ edits by one person in the same 10 minutes and excluded from "real edit".
- **Images:** all 654 downloaded. Upload month comes from the CDN filename suffix (`-MMDDYYYYhhmmss`). Diagrams were found by visually reviewing contact sheets of all 621 rasters.
- **Demand:** PostHog web analytics, `/docs/*` on `agilitycms.com`, last 90 days. ⚠️ Only ~1,000 visitors, because the key was set recently. Directional only (see §10).
- **Scripts and raw data:** session scratchpad (`metrics.json`, `dates.json`, `images.json`). Regenerable in ~10 minutes; worth folding into the audit skill (§8).

### Freshness by category (published articles)

| Category | Published | Created ≤2022 | Real edit since 2025 | Median words |
|---|---|---|---|---|
| Developer | 65 | 35 | 11 | 638 |
| Editor | 54 | 40 | 21 | 368 |
| Training Guide | 40 | 0 | 12 | 488 |
| Owners & Admins | 25 | 19 | 10 | 497 |
| Apps | 25 | 0 | 12 | 696 |
| Overview | 15 | 12 | 5 | 917 |
| Frameworks & SDKs (10 containers) | 101 | 43 | 26 | see framework plan |

---

## 3. What customers come for (priority order)

Ranked from PostHog demand, the 2026-07 competitor teardown ([competitor-teardown.md](competitor-teardown.md)), and where Agility is positioning (Web Studio, page management, AI). Every workstream below is ordered by this list.

| # | Use case | Demand signal (90d) | Today's coverage |
|---|---|---|---|
| 1 | **Connect an AI assistant / agent to Agility** | MCP article is #1 article; `/docs/ai` top 10 | 3 articles, developer-only, drifted |
| 2 | **Get a site built** (concepts → first site → deploy) | `/developers`, `/overview`, building-a-website, CLI, Fetch API all top 15 | Good pieces, no single path; Next.js core refreshed in July |
| 3 | **Edit visually: Web Studio and page management** | web-studio, page-management, co-authoring all in top 40 | Mostly 2024 to 2026, decent |
| 4 | **Model content well** | content-models, concepts, pages-vs-content | 2021 articles, old terms, PNG diagrams |
| 5 | **Go multi-locale and multi-site** | multi-locale (2 articles), multiple-sites, multiple destinations | Fragmented across ~6 overlapping articles |
| 6 | **Ship safely: deploy, CI/CD, webhooks, environments** | checklist, CLI CI/CD, signed webhooks, environments best-practices | Recent and strong |
| 7 | **Commerce and content hub solutions** | ecommerce, content-hub | 2021 diagrams, Gatsby-era stack |
| 8 | **Administer: SSO, roles, security, compliance** | owners-admins landing | 19 of 25 from 2021 |

---

## 4. Workstream A: AI & MCP (the main investment)

### A0. Fix what's wrong today (days)

| Issue | Fix |
|---|---|
| MCP article says **27 tools**; the live server lists **32**. Missing from the article: `publish_content`, `unpublish_content`, `publish_page`, `unpublish_page`, `save_page_model` | Update the article. Then stop hand-maintaining the tool table: generate it from the server's tool list the way `/api-reference` is generated from OpenAPI snapshots, so it can't drift again |
| `.md` twins emit image URLs with raw spaces and parentheses (`![](…/Refresh - Layout SEO (1).png)`), which is invalid Markdown. **69 articles** affected, and these files exist specifically for AI agents | URL-encode image `src` in the serializer ([lib/cms-content/articleMarkdown.ts](../lib/cms-content/articleMarkdown.ts)) |
| `llms.txt` links `/javascript/management-sdk.md`, which 404s (it's a section landing, not an article) | Emit landings without `.md`, or serve a landing `.md` |
| `/docs/ai` hub is staged pending the redesign | Ship with the redesign; it's already getting traffic |

### A1. New articles, by audience

Each is a use case, not a feature tour. Bold = write first.

**Editors** (today: none)
- **Using AI assistants with Agility**: connect Claude / ChatGPT / Copilot in five steps; what you can ask; why everything lands in Staging; how approvals still apply.
- **AI recipes for editors**: one short page each, prompt + result + what to check.
  - Fill in missing SEO titles and descriptions across a section
  - Localize a set of pages into a new locale for review
  - Draft a page from a brief, assembled from existing components
  - Audit content: missing alt text, empty fields, stale items
  - Repurpose one article into variants (summary, social, email)

**Developers** (today: MCP reference, M365 Copilot, app-building)
- **Migrate content into Agility with an AI agent**: from WordPress or another CMS, via MCP plus the Management SDK for volume. Model first, import to Staging, verify, publish. Highest-value developer guide in this track.
- **Model content with AI**: design and create models/components through MCP, with review checkpoints and the reference-name case rules.
- **Build an Agility site with AI coding tools**: Claude Code / Cursor + a starter + an `AGENTS.md` + the Knowledgebase MCP for grounding. Mirrors the existing app-building article for sites.
- **Agents in your content pipeline**: webhook → LLM step → save to Staging → human approval, using the Management API. Includes the "runs with the caller's permissions" model.
- **Make your site readable by AI** (AI as audience): `llms.txt`, `.md` twins, JSON-LD, chunking. The docs site does all of this already; turn it into a how-to for customers.
- **Ground a chatbot on your Agility content**: a hub over the existing Azure AI Search / Algolia / Elastic / Coveo articles, which already cover the RAG mechanics.
- **MCP troubleshooting & FAQ**: OAuth loops, region mismatch, client permission prompts, elicitation support per client.

**Owners & Admins** (today: none)
- **Governing AI access to Agility**: OAuth per user, role-scoped permissions, destructive-action confirmation, revoking access, what the server can and can't reach, audit trail tie-in, M365 DLP. This is what an enterprise buyer asks before allowing MCP at all.

**Overview and Training Guide**
- **AI at Agility: what's possible**: the use-case map for evaluators, linking everything above.
- One **AI module per training track** (editor, developer, architect, admin).

### A2. Diagrams for this track
MCP request flow (exists: [docs-diagram-ai-mcp.svg](diagrams/docs-diagram-ai-mcp.svg)); migration-with-an-agent flow; AI governance trust boundary; agent-in-pipeline with the human approval gate.

---

## 5. Workstream B: diagrams to dual-theme SVG

Rules are in AGENTS.md (one file, both themes, CSS classes not hex attributes, 2026 tokens, never `?format=` on SVG). Upload under the **same filename** convention to the media library; Agility is the system of record.

### 5.1 Worked example (done, not uploaded)
[docs/diagrams/docs-diagram-headless-architecture.svg](diagrams/docs-diagram-headless-architecture.svg) replaces `Agility Headless Architecture.png`, used in **7 Training Guide articles**. The old one used the pre-2026 purple brand, said "Content Manager", drew a "Devices → Asset CDN" arrow that isn't a real flow, and showed no Management API, webhooks or AI agents. The new one shows publish → Fetch API / Asset CDN → site and apps (read), AI agents via MCP and scripts via SDK/CLI → Management API (write), and the publish webhook. Verified rendering in light and dark. Includes `<title>`/`<desc>` for screen readers.

### 5.2 Raster diagrams to redraw (20)

| Priority | Image | Used in | Verdict |
|---|---|---|---|
| 1 | Headless architecture (`633`) | 7 Training Guide articles | ✅ drafted (§5.1) |
| 1 | Data model: sitemap, pages, models (`634`) | 8 Training Guide articles | Redraw |
| 1 | Agility sections map (`635`) | 5 Training Guide articles | Redraw |
| 2 | Content workflow / approvals (`447`) | editors/workflows | Redraw, dated |
| 2 | Page structure: zones + components (`360`, `174`) | introduction-to-pages, page-management-in-a-headless-cms | Merge into one |
| 2 | Linked content flow (`128`) | getting-started-with-linked-content | Redraw, unreadable |
| 2 | Shared vs nested linked content (`161`) | linked-content-field-types | Convert; good design, wrong format |
| 3 | Agility platform architecture (`120`) | developing-with-agility-cms | Merge with §5.1 |
| 3 | Headless ecommerce ×3 (`560`–`562`) | build-a-headless-ecommerce-website | Redraw with current stack |
| 3 | A/B testing ×2 (`572`, `580`) | a-b-n-testing | Convert |
| 3 | Azure AD SSO identity field (`598`) | 2 SSO articles | Convert |
| n/a | Wireframe boxes (`173`), annotated SPA/Jamstack (`176`) | page-management-in-a-headless-cms | Retire, no replacement |
| n/a | Angular folder tree (`0`) | angular-18-ssr-starter | Replace with a code block |
| n/a | Enterprise UX process (`32`) | apps/designing-enterprise-ux | Keep; marketing graphic |

### 5.3 SVGs that break the dual-theme rule (9)
`diagram-two-cdn-layers`, `tab-component-pattern`, `social-autopost-nocode`, `social-autopost-custom`, and 5 `picker-fields-*` illustrations. Mechanical fix: move each hex `fill`/`stroke` into classes with a dark override. No redraw needed.

### 5.4 Concepts that need a diagram and have none
Content states lifecycle (staging, published, unpublished, scheduled) · preview / draft mode flow · publish webhook → revalidate · locales and how pages initialize across them · multi-site on one instance · the four AI diagrams in A2.

---

## 6. Workstream C: modernize the existing corpus

### C1. Quick fixes (days)
- Broken image on `dotNet/blazor-starter`: placeholder `cdn.agilitycms.com/image.jpg`.
- A broken link produces `/docs/owners-admins/null` (6 visitors in 90 days). Find the `href` that renders `null`.
- **Gatsby Cloud** (dead since 2023) is still in two *non-archived* articles: `developers/gatsby-cloud` (archive via the `legacyFrameworks.ts` registry) and `developers/deployment-code-repositories` (edit).
- **Pages Router APIs** (`getStaticProps` etc.) in 5 Next.js articles: aws-amplify, vercel, custom-404, multi-locale, server-side-rendering. Already partly on the framework plan's prune list; the rest go to its Phase 4.

### C2. One vocabulary
Current docs mix terms for the same thing:

| Term | Articles using it |
|---|---|
| "Module" / "Page Module" | 49 |
| "Layout" / "Layout Model" | 27 |
| "Content Manager" | 20 |
| "Page Template" | 20 |
| "Shared Content" | 6 |

Proposed canonical set, matching the 2026 Training Guide: **Component, Component Model, Page Model, Agility (the app)**. Add a glossary article, then sweep. Needs your sign-off (§9).

### C3. Triage the 109 stale articles, then act
Don't rewrite blind. The framework audit showed old articles are sometimes fine (Astro). Each article gets one verdict: **Keep** (verify facts only) · **Refresh** · **Merge** (`superseded` notice, URL stays live) · **Retire** (`archived`, `noindex`).

Merge candidates from titles alone (verify before acting):

| Topic | Overlapping articles |
|---|---|
| Publishing and preview | preview-and-publishing · previewing-content · publishing-a-content-item · batch-content-publishing · publish-multiple-pages |
| Scheduling | scheduling · schedule-content-changes |
| Collaboration | live-collaboration · live-commenting-and-collaboration-in-web-studio · real-time-co-authoring-and-conflict-handling |
| Locales (editor side) | locales · working-with-localized-content · multi-locale-handling-with-sitemaps-and-pages · initialize-a-page-in-another-locale · copying-and-translating-content |
| Restore | deletions-and-restorations · restore-content-from-recycling-bin · restore-a-previous-page-version |
| Introductions | editors/introduction-to-agility-cms · training-guide/content-editor-introduction · overview concepts |

Order of attack follows §3: content modeling (Developer + Overview) → locales → admin/security (19 of 25 from 2021) → remaining Editor articles.

### C4. Solution guides for the top use cases
End-to-end, one page each, linking down into reference articles: **Your first site in an afternoon** (#2), **Going multi-locale** (#5), **Launch checklist** (#6, extend the existing one), **Headless commerce** (#7, rewrite of the 2021 article).

---

## 7. Workstream D: articles we don't have yet

Full research: [content-suggestions/net-new-articles-2026.md](content-suggestions/net-new-articles-2026.md). 40 articles checked against every existing article body, grouped by evaluators, architects, developers, editors, admins and AI. It builds on the [competitor teardown](competitor-teardown.md) rather than repeating it, and adds patterns from SaaS docs that teach (Stripe, Vercel, Supabase, PostHog, Cloudflare, Linear).

**Two audiences this serves that the corpus mostly ignores today:** people *choosing* a platform (fit, architecture, proof of concept, limits, security review) and architects deciding *how* to build (reference architectures, tenancy, modeling anti-patterns).

**Write first:**

| # | Article | Why first |
|---|---|---|
| 1 | What your team builds vs what Agility provides | The most common headless surprise; costs deals and causes bad builds |
| 2 | Is Agility right for your project? When it fits and when it doesn't | Honest scoping makes every other claim credible |
| 3 | What happens to your data when you use AI with Agility | The MCP article is the most-read page; enterprise buyers stop here |
| 4 | Migrate from WordPress to Agility | Highest-volume replatform source; pairs with 1728 |
| 5 | Cutover runbook: content freeze, DNS, redirects, rollback | Launch day is where projects fail; nothing covers it |
| 6 | Content modeling anti-patterns | Fixes the mistakes behind most support tickets |
| 7 | Choose your tenancy model: one instance, many sitemaps, or many instances | Multi-site is a top-5 use case; today's docs list options without deciding |
| 8 | The Agility shared responsibility model | Content already exists in 5 admin articles; consolidate |
| 9 | Understand your plan's limits and usage | Self-service for a recurring support question |
| 10 | Install Agility skills for your coding agent | Stripe-level agent readiness, reusing this repo's skills |

**Guardrails:** no "Agility vs X" pages in the docs (they belong on marketing with legal review and a date stamp); "Migrate from X" sticks to facts about X's export API with a last-verified date; limits, security and AI-data claims need product, security or legal sign-off before publishing.

---

## 8. Keep it from rotting again

- **Extend `audit-framework-docs` to every category** (or add `audit-docs`): bulk-touch-aware freshness, the terminology list from C2, dead-product regexes, image reachability, light-only SVG detection, `.md` validity. The scripts behind this audit are a starting point.
- **Generate, don't hand-write, anything with a machine source**: the MCP tool table (A0) joins the API reference.
- Monthly cadence, alongside `api-spec-drift`.

---

## 9. Decisions needed

1. **Canonical terms** (C2): Component / Page Model / "Agility", as proposed?
2. **Is the 2024 "Refresh" UI still current?** Screenshots are out of scope, but prose that says "click Layouts in the purple sidebar" isn't. Product needs to confirm which UI text is accurate.
3. **Owners per category.** The Nick drafts incident ([screenshots-needed.md](screenshots-needed.md)) shows "old" doesn't mean "unowned". Name an owner per category before merging or retiring anything.
4. **Publishing model.** Proposed: Claude drafts to Staging in batches, a named human reviews and publishes. Nothing goes live without that.
5. **`/docs/ai` timing**: tie to the redesign launch, or publish the hub earlier on the current templates?
6. **Next.js starter vs the docs** (see Progress): bring the starter up to Cache Components so #480/#985 become true, or correct #480/#985 to describe the starter as shipped and present Cache Components as the upgrade path? Docs are cheaper today; the starter upgrade is better long term.
7. **Unverified product facts** the new AI articles avoided rather than guessed: how to revoke a user's MCP OAuth grant, MCP server token/log retention, whether enforced SSO/MFA applies to MCP sign-in, whether version history marks MCP-made changes. Answers unlock article D3 ("What happens to your data").


---

## 10. Devil's advocate: where this plan could be wrong

- **The demand data is thin.** ~1,000 visitors in 90 days, and internal traffic may be in it (the MCP article is exactly what the team itself reads). Re-run the PostHog query in 30 days and add Search Console impressions before cutting anything for low traffic. The AI track survives this objection anyway: it's a strategic bet, not a traffic response.
- **AI content goes stale fastest.** The MCP reference drifted within months. Writing ten AI articles creates ten new things to maintain. Mitigation: recipes are short, the volatile facts (tool lists, client setup steps) live in one generated or linked place, and everything else links to it.
- **Merging breaks things people rely on.** Inbound links, bookmarks and search rankings. The `superseded` convention keeps URLs alive, but rankings move to the canonical page over weeks, not days.
- **Fewer images is a real trade-off.** Deferring screenshots means some 2021 editor articles will describe UI the reader can't see matched. That's acceptable only if C2 and the UI question in §9 are settled first, so the prose is right.
- **109 is a ceiling, not a backlog.** If triage finds most are Keep, the right outcome is a smaller project, not a bigger rewrite.

---

## 11. Sequencing

| Phase | Weeks | Work |
|---|---|---|
| 0 | 1 | A0 + C1 fixes; decisions in §8 |
| 1 | 1–3 | AI track core: editor guide + 2 recipes, migration guide, governance article, MCP article fix. Diagrams 633/634/635 |
| 2 | 3–6 | Remaining AI articles. Diagram priorities 2–3 and the 9 SVG fixes. Glossary + terminology sweep |
| 3 | 6–10 | Triage and act on the 109 (modeling → locales → admin → editor). Solution guides |
| 4 | ongoing | Monthly audit across all categories |

## Decision log

| Date | Decision |
|---|---|
| 2026-10-03 | Plan drafted from a full-corpus audit. Screenshots deferred; diagrams and AI/MCP prioritized at Joel's direction. |
| 2026-10-03 | Executed Phase 0 and most of Phase 1 (see Progress): code fixes in PR #69, 9 new AI articles and 1 section plus 11 article edits saved to Staging, 9 new diagrams and 9 SVG conversions. Net-new research added as §7. |
