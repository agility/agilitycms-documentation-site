# Competitor Docs Teardown — Synthesis

> Produced 2026-07-15/16 for the [rebuild plan](rebuild-plan-2026.md) §9 gate before Phase 3 (hub design). Four sites reviewed via live fetches by parallel research agents: **Sanity, Storyblok, Contentful** (competitors) and **Shopify.dev** (role-based-IA benchmark). Per-site content-gap reports live in [content-suggestions/](content-suggestions/). Contentful's teardown is partial — their client-rendered docs stall non-browser fetchers (see caveat in [contentful.md](content-suggestions/contentful.md)).

## Scores

| Dimension (out of 5) | Sanity | Storyblok | Contentful* | Shopify.dev |
|---|---|---|---|---|
| Time-to-first-success | 4 | 4 | ~3 | 4 |
| Role-based pathing | 3 | 4 | ~3 | 5 |
| Search & ask-AI | 4 | 3 | ~2 | 4 |
| AI/MCP story | **5** | 4 | ~3.5 | 4.5 |

\* Contentful scores are estimates from partial verification.

## The headline: the bar is set by Sanity (AI) and Shopify (IA)

- **Sanity owns the AI-readiness crown:** hosted MCP with one-command per-client setup, `/llms.txt` + `/docs/llms.txt` + `llms-full.txt`, `.md` twin for every article, a dedicated `/docs/ai` IA section, and a literal "For humans / For agents" toggle. Our T7 plan matches every element — shipping it is table stakes, not differentiation.
- **Shopify owns intent-routed IA:** three verb-phrased intent cards ("Build an app…"), track-scoped sidebars, track-prefixed URLs that self-orient from deep links, and "AI as audience" (Agents track) separated from "AI as tool" (Dev MCP). This scales down directly to our Editors/Developers/Admins/AI tracks.
- **Storyblok's cheap wins:** visible "View as Markdown" link per page and "Ask ChatGPT / Ask Claude" hand-off links — zero-infrastructure AI affordances.
- **Contentful is the laggard among competitors** on docs experience (client-rendered, no llms.txt, no ask-AI, editors exiled to a separate Help Center site) — but it's the only competitor documenting its **MCP server inside the docs IA**, with governance framing (per-environment tool permissions, read-only vs read/write).

## Where Agility already wins (protect these)

1. **Role-based Training Guide** with linear developer/architect/admin/editor tracks — no competitor has an equivalent.
2. **Single-site role categories** — Contentful's split Help Center and Sanity's footer-buried user guides both prove the failure modes of the alternatives.
3. **MCP docs live in the docs IA** (unlike Storyblok's labs-subdomain exile) — but the article was crawler-invisible until the SSR fix (PR #51) and needs the flagship treatment (T4).
4. **SSR everywhere** — Sanity's and Contentful's client-rendered pages are invisible to agents; our stack is not. Keep it that way through the rebuild.

## Decisions this teardown locks in for Phase 3 (hub design)

1. **Intent sentences, not persona nouns**, on the hub's track cards: "Manage and publish content / Build a site / Configure & administer / Connect an AI assistant" (Shopify pattern).
2. **AI gets a peer-level track** with two distinct clusters: AI-as-tool (build with assistants, MCP setup → mcp.agilitycms.com for version-coupled specifics) and AI-as-audience (agents managing content). (Shopify + Sanity consensus.)
3. **Search and ask-AI share one ⌘K entry point** ("Search or ask AI") with cited answers — not a separate chat bubble. (Sanity + Shopify pattern; already in the mockup.)
4. **Per-page AI affordances row** on every article: "View as Markdown" + copy-page + optional Ask-ChatGPT/Claude hand-off links. (Storyblok pattern; complements T7 `.md` endpoints.)
5. **Quickstarts get the Shopify treatment:** ≤5 numbered steps, time promise up front, a designed visible success moment, exactly two next steps. Codify in authoring guidelines (see [shopify-dev.md](content-suggestions/shopify-dev.md) §2).
6. **Do NOT** split editors into a separate property, exile MCP docs to a subdomain, use comparison tables for path-choosing, or ship persona-noun-only nav labels.

## Consensus content investments (multi-competitor signal)

| Investment | Signal |
|---|---|
| Per-endpoint API reference with JS/C#/cURL tabs | Sanity + Storyblok + Contentful all stronger here — highest-confidence item in the series |
| `.md` endpoint per article + `/docs/llms.txt` (+ llms-full) | Sanity + Storyblok + Shopify all ship it; Contentful doesn't — differentiation + parity in one move |
| From-scratch framework quickstarts alongside starters | Sanity + Storyblok both beat our starter-first approach |
| Standardized per-framework sub-guide set (quickstart / preview / routing / modeling / i18n / deploy / troubleshoot) | Storyblok's matrix + Shopify's track discipline; fixes our thin Astro/Nuxt/Eleventy/Angular sections |
| Cheat-sheet page format (query recipes, editor day-one) | Sanity's most-linked pages have no equivalent here |

Full per-site detail: [sanity.md](content-suggestions/sanity.md) · [storyblok.md](content-suggestions/storyblok.md) · [shopify-dev.md](content-suggestions/shopify-dev.md) · [contentful.md](content-suggestions/contentful.md)
