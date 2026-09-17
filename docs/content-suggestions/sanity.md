# Content suggestions from Sanity docs teardown

> Produced 2026-07-15 as part of the [rebuild plan](../rebuild-plan-2026.md) §9 competitor teardown. Compares Agility's docs inventory (from agilitycms.com/docs/sitemap.xml, ~380 URLs) against Sanity's docs surface (~400 articles, mapped via sanity.io/docs/llms.txt and section indexes). Scope: articles and content types only — UX/platform findings live in the teardown report.

## 1. Missing topics

### 1.1 Per-client MCP server setup and tools reference (highest priority)
- **Sanity:** https://www.sanity.io/docs/ai/mcp-server — hosted server, one-command setup (`npx sanity@latest mcp configure`), manual config walkthroughs for Claude Code, Cursor, VS Code, v0, Lovable, Replit, and OpenCode, a categorized list of 40+ tools, and OAuth/token auth details.
- **Agility today:** `/docs/developers/agility-cms-mcp-server` has excellent, current content in the CMS (contentID 1287 — 27-tool catalog, per-client install steps, confirmation model), **but it is invisible to crawlers and AI agents**: Markdown articles are converted to HTML in a client-side `useEffect` (`DynamicArticleDetails.js`), so the server-rendered HTML has no article body (verified 2026-07-15 — non-JS fetches return title and nav only). Every Markdown-based article on the site shares this SEO/AI-readability bug. Fix: render Markdown server-side (the rebuild's Phase 2 does this by design; a hotfix on the current site is also possible). The Knowledgebase MCP article (`/docs/overview/agility-knowledgebase-mcp-server`) exists but is developer-framed.
- **Why it matters:** MCP setup docs are the highest-intent AI-era landing content; Sanity treats this as a flagship page.
- **Suggested article:** "Set Up the Agility MCP Server in Claude Code, Cursor & VS Code" — Developers (Extensibility), with example prompts. **Note:** the server has its own site at mcp.agilitycms.com (one-click installs at `/instructions`, tool catalog at `/tools`) — decide canonical ownership per piece: link to mcp.agilitycms.com for anything version-coupled to the server (tool list, install buttons) and keep docs-site material focused on concepts, workflows, and tutorials the MCP site doesn't carry. Avoid drift between the two surfaces.

### 1.2 A "Build with AI" hub section
- **Sanity:** https://www.sanity.io/docs/ai — an IA-level section organizing MCP server, agent context, agent toolkit, AI assist, and get-started under "Supercharge your workflow" / "Add AI to your Sanity apps."
- **Agility today:** two isolated MCP articles in different categories; no AI entry point on the docs landing page.
- **Suggested article(s):** "Building with Agility CMS and AI" hub page — Overview category — linking the two MCP articles, the authoring-with-AI workflow, and item 1.3 below. (Aligns with the redesign's `/docs/ai` flagship page, handoff T4.)

### 1.3 Giving AI agents access to your content (agent-context guide)
- **Sanity:** https://www.sanity.io/docs/ai/sanity-context — turns any dataset into an MCP context endpoint for building doc-lookup/recommendation/editorial assistants, with installable skills (`npx skills add sanity-io/context`).
- **Agility today:** nothing equivalent; the pieces exist (Content Fetch API, MCP server) but no guide assembles them.
- **Suggested article:** "Build an AI Assistant on Your Agility Content (Fetch API + MCP)" — Developers, tutorial format with a working chatbot example.

### 1.4 Query cheat sheet
- **Sanity:** https://www.sanity.io/docs/content-lake/query-cheat-sheet — the single most-linked page in their docs; dozens of copy-paste query recipes (filters, joins, ordering, slicing) with gotcha callouts.
- **Agility today:** API reference articles per endpoint, but no recipe-style single page for Content Fetch filters/sorts or GraphQL patterns.
- **Suggested article:** "Content Fetch & GraphQL Query Cheat Sheet" — Developers (APIs), including the `take: 250` list-limit gotcha and locale/preview parameters.

### 1.5 Editor day-one cheat sheet
- **Sanity:** https://www.sanity.io/docs/user-guides/content-operations-cheatsheet — a "content operators quick start" condensing daily tasks into one reference page.
- **Agility today:** ~51 editor articles but no single-page quick reference; training-guide content is course-shaped, not lookup-shaped.
- **Suggested article:** "Editor Quick Start: Day-One Cheat Sheet" — Editors — find/edit/preview/publish/schedule/roll back on one page, linking out to the deep articles.

### 1.6 Coordinated content releases workflow guide
- **Sanity:** https://www.sanity.io/docs/user-guides/content-releases — an editor-facing guide to planning, grouping, scheduling, and comparing versioned releases across many documents.
- **Agility today:** scheduling (`/docs/editors/scheduling`, `/docs/editors/schedule-content-changes`) and batch publishing exist as separate feature articles; no workflow guide combines them into "how to ship a campaign."
- **Suggested article:** "Plan a Coordinated Content Release with Batches and Scheduling" — Editors, scenario-driven (product launch touching 12 items).

### 1.7 Type-safe content development
- **Sanity:** TypeGen documentation (typed query results generated from schema; surfaced in llms.txt under Developer Tools).
- **Agility today:** JavaScript/TS SDK articles cover fetching but the sitemap shows no article on typing content models or generating interfaces.
- **Suggested article:** "Type-Safe Content with the Agility TypeScript SDK" — Developers (SDKs), showing interface patterns per content model and typed component props in the Next.js starter.

## 2. Covered, but Sanity's treatment is stronger

### 2.1 Next.js getting started
- **Sanity:** https://www.sanity.io/docs/next-js-quickstart — a 4-page sequence (studio setup → schema → display in Next.js → deploy/invite editors) with complete file contents (`client.ts`, `page.tsx`, `[slug]/page.tsx`), ending with content rendered at localhost:3000.
- **Agility:** https://agilitycms.com/docs/nextjs — points to starter repos plus topic articles (Vercel deploy, multi-locale, GA). Starters are great for scaffolding but hide the mechanics; there is no from-scratch path where the developer writes the fetch code themselves.
- **Fix:** add a from-scratch "Next.js in 20 minutes" sequence alongside the starter docs, with every file's full contents and an explicit time promise.

### 2.2 Rich text customization
- **Sanity:** a five-article Portable Text series in https://www.sanity.io/docs/developer-guides (beginner's guide, schema-to-React rendering, inline blocks, custom YouTube embeds, presenting block text).
- **Agility:** a single "rich text customization" article in the developers section.
- **Fix:** expand into a short series — rendering rich text per framework, custom blocks/embeds, sanitization, markdown vs HTML fields.

### 2.3 Webhook-driven automation
- **Sanity:** recipe-style guides — https://www.sanity.io/docs/developer-guides/filters-in-groq-powered-webhooks and https://www.sanity.io/docs/developer-guides/projections-in-groq-powered-webhooks — plus a whole Functions section for event-driven content operations.
- **Agility:** webhooks are documented as API reference in the developers section, without recipes.
- **Fix:** add 2–3 recipe guides: "Rebuild your site on publish," "Sync content changes to Algolia," "Notify Slack on workflow state change."

### 2.4 Implementing front-end search
- **Sanity:** https://www.sanity.io/docs/developer-guides/how-to-implement-front-end-search-with-sanity — a concrete implementation guide with code.
- **Agility:** `/docs/overview/searching-content-at-scale` is conceptual, and the search-enabled Next.js starter buries the implementation in a repo.
- **Fix:** a code-first "Add Search to Your Agility Site" guide (this docs site's own Algolia indexing pipeline is a ready-made case study).

## 3. Format gaps (content types Sanity ships that Agility doesn't)

### 3.1 Cheat-sheet pages as a first-class format
Dense single-page recipe references (GROQ cheat sheet, content-operations cheat sheet) distinct from tutorials and API reference. Agility has tutorials and reference but nothing lookup-optimized. Applies to items 1.4 and 1.5 above.

### 3.2 Sequenced multi-page quickstarts
Sanity splits quickstarts into 3–4 short pages, each one sitting's work with prev/next flow (e.g. `/docs/next-js-quickstart/setting-up-your-studio` → `/defining-a-schema` → `/displaying-content-in-next-js`). Agility's equivalents are single long articles or starter-repo pointers; adopting the sequence format would fix 2.1 for every framework section (Next.js, Astro, Nuxt, .NET).

### 3.3 Inline video clips per setup step
Sanity embeds short Mux video clips directly above individual steps (seen on https://www.sanity.io/docs/next-js-quickstart/setting-up-your-studio) — micro-videos scoped to one command, not full-length walkthrough videos. Agility's video content lives separately in Agility Academy / training guide.

### 3.4 AI-summarized community Q&A library
https://www.sanity.io/answers — hundreds of SEO-indexed pages generated from community questions, capturing long-tail search traffic the curated docs never will. Agility's community answers (Slack, support tickets) are not published; a curated Q&A section under `/docs` would be the equivalent play.
