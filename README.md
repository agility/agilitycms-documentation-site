# Agility CMS Documentation Site

Source for [agilitycms.com/docs](https://agilitycms.com/docs) — the Agility CMS knowledgebase. All content lives in Agility (instance `67bc73e6-u`); this Next.js app renders it.

> **Working on this codebase? Read [AGENTS.md](AGENTS.md) first.** It is the source of truth for architecture, the content model, caching, the proxy, and the gotchas that bite when editing CMS-driven code. This README is the short version.

## Stack

- **Next.js 16 (App Router, Turbopack)** with **Cache Components** — `'use cache'` + `cacheTag`/`cacheLife` and Partial Prerendering. There is no `pages/` directory.
- **React 19**, **TypeScript**, **Tailwind CSS v4** (CSS-first config in [styles/globals.css](styles/globals.css), ocean tokens in [styles/tokens.css](styles/tokens.css)).
- Served under `agilitycms.com/docs` via a Netlify proxy in front of Vercel — see [HOSTING.md](HOSTING.md). `basePath: '/docs'`.
- **Search:** Algolia (`doc_site`). **MCP server:** `/docs/api/mcp`.

## Running locally

```bash
npm install
npm run dev                        # http://localhost:3000/docs — serves STAGING content
FORCE_PUBLISHED=1 npm run dev      # serve published content instead
npm run build && npm start         # production build (prerenders ~500 pages)
```

Copy [.env.local.template](.env.local.template) to `.env.local` and fill in the GUID, API keys and security key from **Settings → API Keys** in the CMS. The template documents every variable.

Local dev serves **staging** content by default, so editors' unpublished work is visible. `FORCE_PUBLISHED=1` makes it behave like production.

## What's here

| Path | |
|---|---|
| `app/[locale]/[...slug]/` | The page route — every CMS-backed page renders through this one catch-all |
| `app/[locale]/api-reference/` | Generated API reference + live explorer (not CMS-backed) |
| `app/api/` | Route handlers: revalidate webhook, preview, MCP server, markdown endpoints, search indexing, explorer |
| `components/agility-pageModules/` | One component per Agility component model |
| `components/agility-pageTemplates/` | Page templates, resolved by name |
| `lib/cms/` | Cached Agility read primitives — every content read goes through these |
| `lib/api-specs/` | OpenAPI snapshots and the operation model behind the API reference |
| `proxy.ts` | Locale routing, preview entry/exit, markdown rewrites, and real 404s |
| `docs/` | Plans, handoffs and design references — start with [rebuild-plan-2026.md](docs/rebuild-plan-2026.md) |

## Things that will surprise you

These have each cost someone a debugging session. The full list is in [AGENTS.md](AGENTS.md#gotchas--conventions-read-before-editing-cms-driven-code-or-content).

- **Agility list calls default to 50 items and cap at 250.** Always pass an explicit `take`. This has silently dropped sidebar articles.
- **404s are decided in `proxy.ts`, not by `notFound()`.** Under Cache Components the 200 is already on the wire before a page can call it. A hand-written route that isn't registered in `isAppPath` will 404 in production while working perfectly in `next dev`.
- **Cache Components rejects `Math.random()`/`Date.now()` outside a cached scope**, and an uncached `fetch` reached from a render makes the page re-render on every request. After a build, no *concrete* page should be postponed:
  ```bash
  find .next/server/app -name '*.meta' | grep -v '\[' | xargs grep -l '"postponed"' | wc -l   # must be 0
  ```
- **Adding a new `process.env` read needs a rebuild** before `next start` sees it, even with the value in `.env.local`.

## Content

Documentation articles are authored in Agility, not here. Categories map to *pairs* of containers (`DeveloperArticles` + `DeveloperSections`, and so on) — there is no single Articles container. See [AGENTS.md](AGENTS.md#content-model-instance-67bc73e6-u), and [.claude/skills/authoring-agility-docs/SKILL.md](.claude/skills/authoring-agility-docs/SKILL.md) for the full category→container map and the publishing workflow.

## Machine readability

- `/docs/llms.txt` — an index of the docs for AI agents
- `<any article URL>.md` — that article as clean markdown
- `/docs/api/mcp` — MCP server (`search_docs`, `fetch_doc`)
- `/docs/api-reference` — every REST endpoint, generated from the OpenAPI specs
