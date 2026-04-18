# Agents

This document provides context for AI agents working with this codebase.

## Project Overview

This is the source code for the [Agility CMS Documentation Site](https://agilitycms.com/docs) — a Next.js application that serves as the official knowledgebase for Agility CMS. All documentation content is managed in Agility CMS (headless) and rendered via this frontend.

## Architecture

- **Framework**: Next.js 14 (Pages Router primary, App Router for MCP endpoint)
- **CMS**: Agility CMS — content is fetched via GraphQL (`@apollo/client`) and the Agility SDK (`@agility/nextjs`)
- **Search**: Algolia (`algoliasearch`) — index name `doc_site`
- **MCP Server**: Streamable HTTP endpoint at `/docs/api/mcp` using `mcp-handler`
- **Styling**: Tailwind CSS
- **Hosting**: Vercel with ISR (Incremental Static Regeneration)
- **Base Path**: All routes are under `/docs` (configured in `next.config.js`)

## Key Directories

```
app/api/mcp/          — MCP server endpoint (App Router)
pages/                — Site pages and API routes (Pages Router)
pages/api/search/     — Algolia indexing endpoints
components/           — React components
  agility-pageModules/  — CMS-driven page modules
  common/               — Shared components (Search, Layout, etc.)
utils/                — Utility functions (search normalization, sitemap, etc.)
lib/cms/              — Agility CMS SDK integration
```

## MCP Server (`app/api/mcp/route.ts`)

The Agility Knowledgebase MCP server exposes two read-only tools over the Model Context Protocol:

- **`search_docs`** — Full-text search across all documentation articles via Algolia
- **`fetch_doc`** — Retrieve complete article content by objectID

Clients connect at: `https://agilitycms.com/docs/api/mcp`

See [app/api/mcp/README.md](app/api/mcp/README.md) for full details.

## Search Indexing

Articles are indexed into the `doc_site` Algolia index with these searchable attributes: `title`, `headings`, `body`, `description`. Indexing is triggered via:

- `POST /docs/api/search/indexAllArticles` — Bulk re-index all articles
- `POST /docs/api/search/indexArticle` — Index a single article (used by CMS webhooks)

The normalization logic lives in `utils/searchUtils.js` and handles both EditorJS block content and Markdown content.

## Environment Variables

| Variable | Purpose |
|---|---|
| `AGILITY_GUID` | Agility CMS instance GUID |
| `AGILITY_API_FETCH_KEY` | Published content API key |
| `AGILITY_API_PREVIEW_KEY` | Preview content API key |
| `AGILITY_SECURITY_KEY` | Webhook security key |
| `ALGOLIA_APP_ID` | Algolia application ID (server-side) |
| `ALGOLIA_ADMIN_API_KEY` | Algolia admin key (server-side, for indexing and getObject) |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` | Algolia app ID (client-side) |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | Algolia search-only key (client-side) |

## Running Locally

```bash
yarn install
yarn dev
# Site available at http://localhost:3000/docs
# MCP endpoint at http://localhost:3000/docs/api/mcp
```

## Content Model

Documentation articles have these key fields:

- `title` — Article title
- `content` — EditorJS block content (JSON)
- `markdownContent` — Markdown content (alternative to EditorJS)
- `description` — Short description
- `section` — Parent section (linked content)
- `concept` — Related concept (linked content)

Articles are organized under `doccategories`, each with a `title`, `subTitle`, and linked `articles`.
