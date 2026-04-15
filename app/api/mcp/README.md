# Agility Knowledgebase MCP Server

This directory contains the Model Context Protocol (MCP) server for the Agility CMS documentation site. It allows AI assistants and tools to search and retrieve documentation articles programmatically.

This is separate from the main [Agility CMS MCP server](https://github.com/agility/agility-cms-mcp) which provides content management operations. This server is read-only and focused on searching the documentation knowledgebase.

## Endpoint

```
Production:  https://agilitycms.com/docs/api/mcp
Local:       http://localhost:3000/docs/api/mcp
```

Transport: **Streamable HTTP** (SSE disabled for broad client compatibility including ChatGPT Deep Research)

## Tools

### `search_docs`

Search the Agility CMS documentation. Returns matching articles with titles, URLs, descriptions, categories, and content snippets.

**Input:**
| Parameter | Type | Description |
|---|---|---|
| `query` | `string` (required) | Search query string |

**Output:** JSON with `totalHits`, `page`, `totalPages`, and an array of `results`, each containing:
- `objectID` — Unique article identifier (use with `fetch_doc`)
- `title` — Article title
- `url` — Article URL path (relative to site root)
- `description` — Short article description
- `category` — Parent category (e.g. "Developers", "Overview")
- `section` — Parent section (e.g. "APIs", "Quick Start")
- `snippet` — Body text snippet with search term highlighting

### `fetch_doc`

Retrieve the full content of a documentation article by its ID. Use after `search_docs` to get complete article text.

**Input:**
| Parameter | Type | Description |
|---|---|---|
| `objectID` | `string` (required) | Article objectID from search results |

**Output:** JSON with full article data:
- `title`, `url`, `description`, `category`, `section` — Same as search results
- `body` — Full article body text (up to 5000 characters)
- `headings` — Array of section headings within the article

## Configuration

The handler is configured in `route.ts` with these options:

```ts
{
  basePath: "/api",       // URL path prefix
  verboseLogs: true,      // Detailed request logging
  maxDuration: 60,        // 60-second timeout
  disableSse: true,       // Streamable HTTP only (no SSE transport)
}
```

## Connecting from MCP Clients

### Claude Code / Cursor / Windsurf

Add to your MCP configuration (`.cursor/mcp.json`, `.claude/settings.json`, etc.):

```json
{
  "mcpServers": {
    "agility-knowledgebase": {
      "url": "https://agilitycms.com/docs/api/mcp"
    }
  }
}
```

### ChatGPT Deep Research

1. Open ChatGPT Settings > Connectors
2. Add server URL: `https://agilitycms.com/docs/api/mcp`

## Testing

### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Then in the inspector UI:
1. Select **Streamable HTTP** transport
2. Enter URL: `http://localhost:3000/docs/api/mcp`
3. Click **Connect**
4. Use **List Tools** to verify both tools appear
5. Test `search_docs` with a query like "content fetch api"

### With curl

```bash
# Initialize session
curl -X POST http://localhost:3000/docs/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0" }
    },
    "id": 1
  }'

# Search
curl -X POST http://localhost:3000/docs/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_docs",
      "arguments": { "query": "content fetch api" }
    },
    "id": 2
  }'
```

## Dependencies

- `mcp-handler` — MCP server adapter for Next.js
- `@modelcontextprotocol/sdk` — MCP protocol implementation
- `zod` — Input schema validation
- `algoliasearch` — Algolia search client (queries the `doc_site` index)

## Environment Variables Required

- `ALGOLIA_APP_ID` — Algolia application ID
- `ALGOLIA_ADMIN_API_KEY` — Algolia admin API key (needed for `getObject` in `fetch_doc`)
