# Content suggestions from Shopify.dev benchmark

> Produced 2026-07-15 as part of the [rebuild plan](../rebuild-plan-2026.md) §9 competitor teardown. Source: shopify.dev role-based IA benchmark (fetched live). Agility inventory: 417 URLs from agilitycms.com/docs/sitemap.xml across `/docs/overview` (18), `/docs/editors` (57), `/docs/developers` (115), `/docs/owners-admins` (25), `/docs/training-guide` (50), `/docs/apps` (32), plus framework sections (`/docs/nextjs` 25, `/docs/dotNet` 11, `/docs/javascript` 8, `/docs/gatsby` 8, and 5–6 each for nuxt/eleventy/astro/angular). Shopify is not a CMS competitor; these are content-type and editorial-pattern adoptions, not topic parity. Suggestions numbered 1–12 in priority order.

## 1. Content types we lack

### 1. An "AI & Agents" content cluster that separates AI-as-audience from AI-as-tool
Shopify runs two distinct surfaces: a top-level **Agents** track for AI agents as consumers of the platform (https://shopify.dev/docs/agents — UCP, MCP servers for cart/checkout/orders) and a **Dev MCP / AI Toolkit** page for humans building *with* AI (https://shopify.dev/docs/apps/build/devmcp, installable in Claude Code, Cursor, Codex, VS Code). Agility has three scattered articles (`/docs/developers/agility-cms-mcp-server`, `/docs/overview/agility-knowledgebase-mcp-server`, `/docs/apps/building-apps-with-ai-coding-tools`) and no cluster.
**Write:** a series under **Developers** (or a new top-level "AI" card beside Editors/Developers/Owners & Admins):
- "Connect Your AI Assistant to Agility" (per-IDE setup: Claude Code, Cursor, VS Code — link mcp.agilitycms.com/instructions for version-coupled install specifics)
- "Managing Content with AI Agents via the Agility MCP Server" (AI-as-audience: modeling, authoring, workflow limits)
- "Agent-Readable Docs: Markdown Endpoints and llms.txt" — and actually ship `.md` endpoints + `/docs/llms.txt` on this site (Shopify serves raw markdown with `source_url` frontmatter at e.g. https://shopify.dev/docs/apps/build/scaffold-app.md; verified live)
- "Vibe-Building an Agility Site: Prompts That Work"

### 2. A CLI-first quickstart engineered to a 3-step first success
Shopify's scaffold quickstart (https://shopify.dev/docs/apps/build/scaffold-app) is 2 clicks from the landing page and 3 numbered steps (`shopify app init` → `shopify app dev` → press `p`, click "Generate a product"), ending in a built-in verifiable success moment. Agility's flagship `/docs/developers/quick-start-the-basics` is UI-screenshot-driven with ~20+ discrete actions before the curl payoff, and Agility already has a CLI (`/docs/developers/cli`, `/docs/developers/cli-public-beta`) that the quickstart ignores.
**Write:** "Quick Start: Site Running in 3 Commands" under **Developers › Getting Started** (`agility new` equivalent → `npm run dev` → see CMS content render; edit a field in the CMS, watch it change). Keep the existing UI walkthrough as the Editors-flavored alternative.

### 3. Troubleshooting pages paired with every quickstart and framework section
Agility has exactly one framework troubleshooting article in 417 (`/docs/nextjs/troubleshooting-fetch-failed-errors-in-next-js`) plus two locked inside the Training Guide (`content-editor-troubleshooting`, `admin-troubleshooting`).
**Write:** a "Troubleshooting" article per framework section (**Next.js, .NET, JavaScript SDK** first): auth/API-key failures, preview not updating, empty content lists (the take-50 default), locale mismatches. Link each from the corresponding getting-started article's final section.

### 4. A real, faceted changelog with a machine-readable feed
Shopify's changelog (https://shopify.dev/changelog) is dated, tagged by track (APPS / STOREFRONTS / DEV PLATFORM) and API surface, and serves https://shopify.dev/changelog.md. Agility's `/docs/changelog` is a single-URL shell — a "Platform" filter with no visible dated entries, tags, or feed.
**Build/write:** dated entries tagged by audience (Editors / Developers / Admins) and surface (Fetch API / Management API / Web Studio / SDKs), plus RSS and a `.md` endpoint. Belongs in **Developers › Developer Changelog** (already linked from that landing).

### 5. Versioning, deprecation, and support-policy documentation
Shopify documents quarterly date-named versions, 12-month support windows, and a `latest` alias (https://shopify.dev/docs/api/usage/versioning). Agility's sitemap has no versioning-policy article at all — nothing tells a developer how long an SDK major version or API behavior is supported, or how breaking changes are communicated.
**Write:** "API and SDK Versioning & Deprecation Policy" under **Developers › APIs**, cross-linked from every SDK section and the changelog.

### 6. Best-practices cluster promoted out of the Training Guide
Shopify gives BEST PRACTICES its own sidebar group in every track (Performance, Accessibility, Localization, Security, Compliance — visible on https://shopify.dev/docs/apps/build). Agility's equivalents are scattered (`/docs/overview/image-best-practices`, `/docs/overview/cms-environments-development-and-content-workflow-best-practices`, `/docs/developers/website-deployment-checklist`) or buried in Training (`training-guide/developer-best-practices`, `architect-performance`, `architect-security`).
**Write/reorganize:** a "Best Practices" group under **Developers** with concrete titles: "Performance: Caching and CDN Strategy" (consolidating `content-delivery-and-cdn-architecture` + `developer-caching`), "Accessibility for Component-Driven Pages" (net-new — no accessibility article exists today), "Securing Your Agility Integration" (tokens, webhooks, preview keys).

### 7. "Run it now" affordances in API docs
Shopify's assistant and API reference attach a "Run in GraphiQL" button to every query (https://shopify.dev/changelog/a-more-powerful-dev-assistant-on-shopifydev); the reference offers tabbed examples per integration context (cURL / React Router / Ruby / Node / CLI — https://shopify.dev/docs/api/admin-graphql/latest/queries/products). Agility has `testing-on-swagger` and `graphql-api` but the API articles are single-snippet.
**Write/retrofit:** every API article in **Developers › APIs** gets tabbed cURL / JS SDK / Next.js examples and a deep link that opens the query pre-filled in the GraphQL playground or Swagger. (Converges with the rebuild's Phase 5a API playground.)

## 2. Editorial patterns to codify in authoring guidelines

### 8. Every tutorial ends with a designed first-success moment plus exactly two next steps
Shopify's scaffold quickstart ends at a button the reader clicks to see a product appear, then offers exactly two links (feature tutorial; deploy). Exemplars: https://shopify.dev/docs/apps/build/scaffold-app, https://shopify.dev/docs/storefronts/themes/getting-started/create. Agility's `quick-start-the-basics` has a good success moment (curl returns `"Hello World 🌎"`) but zero next-step links — the reader dead-ends. **Rule: name the observable success in the intro ("you'll see your content rendered at localhost:3000"), and close with exactly two next steps, never zero, never a link farm.**

### 9. Intent-sentence forks instead of comparison tables
Shopify splits Themes vs Headless with two contrasting value-prop sentences ("Complete customization, on Shopify's fully managed platform" vs "Full-stack control…") rather than a feature matrix (https://shopify.dev/docs/storefronts). Apply to Agility's framework chooser on `/docs/developers` (currently eight undifferentiated SDK cards) and to Pages-vs-Content-first decisions (`/docs/editors/pages-vs-content`). **Rule: route decisions with one self-identifying sentence per path.**

### 10. Numbered steps with visible command counts and time estimates
Shopify quickstarts are 3–4 numbered steps, each step headed by its outcome, ~4 commands total, and the reader can see the end from the start. Agility's quickstart sprawls across 7 unnumbered section headings and 20+ actions with no time estimate. **Rule: quickstarts state estimated time up front, use ≤5 numbered steps, and merge setup ceremony into single steps the way `shopify app dev` bundles login + tunnel + DB.**

### 11. Prerequisites inline, not as link-outs
Shopify's honest path balloons from 2 clicks to 4–5 pages because prerequisites are bare links — the one pattern to beat rather than copy. Agility's quickstart already handles this well ("You'll need a login…" inline). **Rule: prerequisites are a short inline checklist with copy-paste setup where possible; link-outs only for genuinely optional depth.**

### 12. Task-verb titles, consistently
Shopify entry links are verbs ("Build your first app", "Create a new theme", "Customize an existing theme"). Agility mixes strong task titles ("How to Create a Content Model") with noun-only ones ("Sitemaps", "Fields", "Groups") and keyword-stuffed ones (`dynamic-content-control-implementing-hide-when-formulas-in-your-headless-cms-content-model`). **Rule: guides get verb-first titles ≤8 words; concept pages get noun titles; never SEO-sentence titles.**

## 3. Thin or stale spots in the current sitemap

- **Gatsby Cloud content is dead-platform stale:** `/docs/gatsby/deploying-gatsby-to-gatsby-cloud`, `/docs/gatsby/configure-gatsby-cloud-previews`, and `/docs/developers/gatsby-cloud` document a product Netlify shut down; archive or rewrite for Netlify/Vercel and demote the Gatsby section.
- **`/docs/changelog` is a one-URL shell** — a filter UI with no visible dated entries, tags, or feed (see suggestion 4). This is the largest credibility gap versus the shopify.dev standard.
- **Micro-sections that can't sustain a track:** `/docs/astro` (5), `/docs/nuxt` (6), `/docs/eleventy` (6), `/docs/angular` (6) each have only starter + deploy articles — no data-fetching, preview, caching, or troubleshooting depth. Either bring each to the Next.js standard set (starter / how-it-works / preview / caching / deploy / troubleshoot) or fold them into one "Other Frameworks" hub. `/docs/angular/angular-18-ssr-starter` also names a framework version now several majors old — verify currency.
- **`/docs/professional-services`** is a single landing URL with no children — either populate or remove from docs IA.
- **Legacy-flagged articles worth a freshness pass:** `/docs/developers/updating-legacy-input-forms`, `/docs/developers/legacy-content-migration`, `/docs/developers/cli-public-beta` and `/docs/developers/personal-access-tokens-public-beta` (if these features have since GA'd, "public beta" titles are stale metadata AI assistants will repeat).
