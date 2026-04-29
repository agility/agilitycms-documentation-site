// @ts-nocheck — Zod v3 + McpServer.tool() causes infinite type recursion
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import algoliasearch from "algoliasearch";
import {
  initializeTelemetry,
  trackMcpToolCall,
  trackAlgoliaCall,
  trackException,
} from "../../../lib/telemetry";

// Initialize telemetry on module load (safe to call multiple times)
initializeTelemetry();

const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);
const index = algoliaClient.initIndex("doc_site");

const BASE_URL = "https://agilitycms.com/docs";

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

function fullUrl(path: string): string {
  if (!path || path === "undefined") return "";
  return `${BASE_URL}${path}`;
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    return new Error(String((err as any).message));
  }
  return new Error(String(err));
}

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "search_docs",
      [
        "Search the Agility CMS documentation using concise semantic queries.",
        "Do not use long keyword bundles. For broad, ambiguous, or multi-part questions, call search_docs multiple times with short related queries, each focused on one concept, synonym, or likely documentation phrase. Compare the returned articles and use fetch_doc on the most relevant results for detailed analysis.",
        "",
        "Good queries are usually 3 to 8 words or one short question.",
        "",
        "Examples:",
        '- "content staging workflow"',
        '- "manage content across environments"',
        '- "deployment environments"',
        '- "preview content before publishing"',
        '- "CI/CD content synchronization"',
        "",
        "Avoid:",
        '- "multiple environments devops content operations environments staging production development preview publishing workflow ci cd"',
        "",
        "If a search returns no or weak results, retry with shorter semantic alternatives before concluding that no documentation exists.",
      ].join("\n"),
      {
        query: z
          .string()
          .describe(
            "A concise semantic search query, usually 3 to 8 words or one short natural-language question. Search one concept at a time. For broad questions, call search_docs multiple times with short related queries instead of sending one long keyword list. Avoid keyword stuffing."
          ),
        page: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe(
            "Page number for pagination (0-based). Omit for the first page."
          ),
      },
      {
        title: "Search documentation",
        readOnlyHint: true,
      },
      async ({ query, page }: { query: string; page?: number }) => {
        const startTime = Date.now();

        // Steer callers away from keyword-stuffed queries before they
        // burn an Algolia call. Semantic search is recall-poor on long
        // bundles; multiple short queries return better results.
        const wordCount = query.trim().split(/\s+/).filter(Boolean).length;
        const MAX_QUERY_WORDS = 12;
        if (wordCount > MAX_QUERY_WORDS) {
          const hint = [
            `This query is too broad (${wordCount} words). Semantic search works best with short focused queries.`,
            "",
            "Retry with multiple shorter searches (3 to 8 words each), each targeting one concept, synonym, or likely documentation phrase. Compare the result sets and call fetch_doc on the most relevant articles.",
            "",
            "Example: instead of one keyword bundle, try short queries like:",
            '- "content staging workflow"',
            '- "deployment environments"',
            '- "preview content before publishing"',
          ].join("\n");

          trackMcpToolCall(
            "search_docs",
            { query, page: page || 0, blocked: "query_too_long", wordCount },
            Date.now() - startTime,
            true
          );

          return {
            content: [
              {
                type: "text" as const,
                text: hint,
              },
            ],
          };
        }

        try {
          const algoliaStart = Date.now();
          const results = await index.search(query, {
            page: page || 0,
            hitsPerPage: 10,
            attributesToSnippet: ["body:50"],
            snippetEllipsisText: "...",
            attributesToRetrieve: [
              "title",
              "url",
              "description",
              "category",
              "section",
            ],
            attributesToHighlight: [],
          });
          trackAlgoliaCall(
            "search",
            query,
            Date.now() - algoliaStart,
            true,
            results.nbHits
          );

          const lines: string[] = [
            `# Search Results: "${query}"`,
            `Found ${results.nbHits} results (page ${results.page + 1} of ${results.nbPages})`,
            "",
          ];

          results.hits.forEach((hit: any, i: number) => {
            const url = fullUrl(hit.url);
            const snippet = stripHtml(
              hit._snippetResult?.body?.value || ""
            );
            lines.push(`## ${i + 1}. ${hit.title}`);
            if (url) lines.push(`**URL:** ${url}`);
            if (hit.category || hit.section)
              lines.push(
                `**Category:** ${hit.category || ""}${hit.section ? ` > ${hit.section}` : ""}`
              );
            if (hit.description) lines.push(`> ${hit.description}`);
            if (snippet) lines.push(`\n${snippet}`);
            lines.push(`\n*objectID: ${hit.objectID} — use with fetch_doc for full content*`);
            lines.push("");
          });

          if (results.nbPages > (results.page + 1)) {
            lines.push(`---`);
            lines.push(`*More results available — use page: ${results.page + 1} to see the next page*`);
          }

          trackMcpToolCall(
            "search_docs",
            { query, page: page || 0 },
            Date.now() - startTime,
            true
          );

          return {
            content: [
              {
                type: "text" as const,
                text: lines.join("\n"),
              },
            ],
          };
        } catch (err) {
          const error = toError(err);
          trackAlgoliaCall("search", query, Date.now() - startTime, false, undefined, error);
          trackMcpToolCall(
            "search_docs",
            { query, page: page || 0 },
            Date.now() - startTime,
            false,
            error
          );
          trackException(error, { toolName: "search_docs", query });

          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Search failed for query '" + query + "'",
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "fetch_doc",
      "Retrieve the full content of a documentation article by its ID. Use this after finding relevant documents with the search_docs tool to get complete information for analysis and citation.",
      {
        objectID: z
          .string()
          .describe("The article's objectID from search results"),
      },
      {
        title: "Fetch document",
        readOnlyHint: true,
      },
      async ({ objectID }: { objectID: string }) => {
        const startTime = Date.now();
        try {
          const algoliaStart = Date.now();
          const doc: any = await index.getObject(objectID, {
            attributesToRetrieve: [
              "title",
              "url",
              "description",
              "category",
              "section",
              "body",
              "headings",
            ],
          });
          trackAlgoliaCall(
            "getObject",
            objectID,
            Date.now() - algoliaStart,
            true,
            1
          );

          const url = fullUrl(doc.url);
          const body = stripHtml(doc.body || "");
          const lines: string[] = [
            `# ${doc.title}`,
          ];
          if (url) lines.push(`**URL:** ${url}`);
          if (doc.category || doc.section)
            lines.push(
              `**Category:** ${doc.category || ""}${doc.section ? ` > ${doc.section}` : ""}`
            );
          if (doc.description) lines.push(`> ${doc.description}`);
          if (doc.headings?.length) {
            lines.push("");
            lines.push("**Sections:** " + doc.headings.join(" | "));
          }
          lines.push("");
          lines.push(body);

          trackMcpToolCall(
            "fetch_doc",
            { objectID },
            Date.now() - startTime,
            true
          );

          return {
            content: [
              {
                type: "text" as const,
                text: lines.join("\n"),
              },
            ],
          };
        } catch (err) {
          const error = toError(err);
          trackAlgoliaCall("getObject", objectID, Date.now() - startTime, false, undefined, error);
          trackMcpToolCall(
            "fetch_doc",
            { objectID },
            Date.now() - startTime,
            false,
            error
          );
          trackException(error, { toolName: "fetch_doc", objectID });

          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Document with ID '" + objectID + "' not found",
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        search_docs: {
          description:
            "Search Agility CMS documentation using concise semantic queries. Prefer multiple short focused queries over long keyword bundles.",
        },
        fetch_doc: {
          description: "Retrieve full article content by ID",
        },
      },
    },
  },
  {
    basePath: "/api",
    verboseLogs: process.env.NODE_ENV !== "production",
    maxDuration: 60,
    disableSse: true,
  }
);

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers":
    "content-type, accept, authorization, mcp-protocol-version, mcp-session-id",
  "access-control-expose-headers": "mcp-session-id",
  "access-control-max-age": "86400",
};

// Wrap handler to (1) fix Accept header for MCP clients that don't send
// text/event-stream (e.g. Claude) — mcp-handler requires both
// application/json AND text/event-stream explicitly listed, and rejects
// Accept: */* with a 406; (2) unwrap SSE-framed single POST responses
// back to plain JSON — Anthropic's mcp-proxy returns 502 when forwarding
// chunked SSE bodies for single replies; and (3) add CORS headers so
// browser-based MCP clients can connect.
function withMcpHeaders(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const accept = req.headers.get("accept") || "";
    const hasJson = accept.includes("application/json");
    const hasSse = accept.includes("text/event-stream");
    if (!hasJson || !hasSse) {
      const headers = new Headers(req.headers);
      headers.set("accept", "application/json, text/event-stream");
      req = new Request(req, { headers });
    }

    const res = await fn(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      const match = text.match(/(?:^|\n)data: (.+?)(?:\n|$)/);
      if (match) {
        headers.set("content-type", "application/json");
        headers.delete("transfer-encoding");
        headers.delete("content-length");
        return new Response(match[1], {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      }
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}

export const GET = withMcpHeaders(handler);
export const POST = withMcpHeaders(handler);
export const DELETE = withMcpHeaders(handler);

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
