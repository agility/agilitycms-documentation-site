# Content suggestions from Contentful docs teardown

> Produced 2026-07-16 as part of the [rebuild plan](../rebuild-plan-2026.md) §9 competitor teardown. **Verification caveat:** Contentful's developer docs are client-side rendered and stall non-browser fetchers (research-agent fetches hung for hours), so this report is assembled from the fetches that *did* succeed plus search corroboration. Items marked *(unverified)* were not directly confirmed and should be spot-checked in a browser before acting on them. Agility inventory basis: 394 URLs from agilitycms.com/docs/sitemap.xml.

**Where Contentful's docs surface sits:** developer docs at `/developers/docs/` (sidebar: Concepts, Tutorials, SDKs, API Reference, Extensibility, Platform, Studio, Personalization, Analytics, Tools and Plugins) and a separate editor-facing **Help Center** at `/help/` (Getting started, Content models/types/fields, Entries, Media, Localization, Roles, AI Actions, Apps, FAQ). No `llms.txt` at root or docs level (verified 404). No embedded ask-AI observed. Their **MCP server is documented inside the docs IA** at https://www.contentful.com/developers/docs/tools/mcp-server/ (verified via search + docs URL) — the only competitor in this study that does so.

## 1. Missing topics

### 1.1 MCP tool-permission and governance documentation
- **Contentful:** their MCP docs cover admin-configurable tool categories per environment (entries, assets, content types, AI Actions) with **read-only vs read/write access**, and recommend human confirmation of tool calls — governance framing, not just setup (https://www.contentful.com/developers/docs/tools/mcp-server/).
- **Agility today:** the MCP article documents the confirmation gates but there is no owner/admin-facing article about *governing* agent access (which users should connect agents, what permissions apply, audit trail).
- **Suggested article:** "Governing AI Agent Access to Your Instance" — **Owners & Admins** — permissions model for MCP connections, what the audit trail captures, recommended rollout (read-heavy first). Pairs with the existing audit-trail article.

### 1.2 Scripted content-model migration guide
- **Contentful:** `contentful-migration` scripting is a flagship developer capability — model changes as versioned code, run in CI *(depth unverified this pass)*.
- **Agility today:** `/docs/developers/cli-ci-cd-integration-guide` and CLI articles exist, but there's no end-to-end "model changes as code, promoted through environments" guide.
- **Suggested article:** "Promote Content Model Changes Through Environments with the CLI" — **Developers (CLI)** — a worked example: change a model in dev, export, review in PR, apply to production.

### 1.3 Editor-facing AI features documentation
- **Contentful:** Help Center has a dedicated **AI Actions** section (`/help/ai-automations/ai-actions/`) documenting in-product AI for content teams.
- **Agility today:** AI content is developer-framed (MCP, building apps with AI tools). Nothing tells an *editor* what AI can do for them day-to-day.
- **Suggested article:** "Using AI in Your Authoring Workflow" — **Editors** — agent-assisted drafting via MCP-connected assistants, what stays human-gated (publish/workflow), practical prompts. Feeds the redesign's AI cluster (T4/T5).

### 1.4 GraphQL tutorials beyond the reference
- **Contentful:** GraphQL is a first-class tutorial track on the docs landing (paired with Next.js/React/Vercel tutorials).
- **Agility today:** `/docs/developers/graphql-api` + `/docs/developers/graphql-operators` are reference-only; no tutorial builds something with GraphQL.
- **Suggested article:** "Build a Page with the GraphQL API (Next.js)" — **Developers (APIs)** — including the `take` limit gotcha and linked-content resolution patterns.

## 2. Covered but weaker

### 2.1 Per-language API reference
- **Contentful:** API references (CMA, CDA, Preview, GraphQL) each ship per-language/SDK treatments *(structure known; per-page depth unverified)*.
- **Agility:** single prose article per API + Swagger link. Same finding as Storyblok #10 and Sanity #1.4 — this is now a three-competitor consensus: **restructure API docs into per-endpoint pages with JS + C# + cURL tabs.** Highest-confidence content investment in the whole teardown series.

### 2.2 Extensibility/app-building docs organization
- **Contentful:** "Extensibility" is a top-level docs section housing the App Framework material.
- **Agility:** app-building content is solid (`apps-sdk`, `creating-apps-for-agility`, `developing-apps-locally-new-and-existing`, Plenum articles) but scattered across the Apps category alongside *catalog* articles (Cloudinary, YouTube, etc.). Split "using apps" (catalog) from "building apps/extending" (developer extensibility cluster) in the redesign IA.

## 3. Format gaps

### 3.1 Separate editor Help Center — a pattern to consciously reject
Contentful splits editors into a separate site (`/help/`) with its own IA. It gives editors a clean home but breaks cross-linking, splits search, and duplicates concepts. **Agility's single-site role categories + Training Guide is the better architecture** — the redesign should double down (role-scoped sidebars, one search) rather than copy the split. Keep this as an explicit design principle in the T3/T5 work.

### 3.2 Tier-aware "get help" routing
Contentful's Help Center routes support expectations by plan tier (community vs ticket vs prioritized). Agility's getting-help block lists channels without setting expectations. **Suggested:** a short "How to Get Help (and What to Expect)" page — **Overview** — channels, SLAs by plan, what to include in a ticket.

### 3.3 What NOT to copy (exploit instead)
- **Client-rendered docs** that stall crawlers and agents (same flaw as Sanity's hubs) — our SSR + `.md` endpoints + `llms.txt` plan directly outflanks both.
- **No llms.txt, no visible ask-AI** — despite shipping an MCP server, their docs aren't agent-readable. The T7 machine-readability work is a genuine differentiator against Contentful specifically.
