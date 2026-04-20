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
      "Search the Agility CMS documentation. Returns matching articles with titles, URLs, descriptions, categories, and content snippets. Use the fetch_doc tool to get full article content for detailed analysis.",
      {
        query: z
          .string()
          .describe(
            "Search query string. Natural language queries work best."
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
          description: "Search Agility CMS documentation",
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

// Wrap handler to fix Accept header for MCP clients that don't send
// text/event-stream (e.g. Claude) — mcp-handler returns 406 without it
function withAcceptHeader(fn: (req: Request) => Promise<Response>) {
  return (req: Request) => {
    const accept = req.headers.get("accept") || "";
    if (!accept.includes("text/event-stream") && !accept.includes("*/*")) {
      const headers = new Headers(req.headers);
      headers.set("accept", "application/json, text/event-stream");
      req = new Request(req, { headers });
    }
    return fn(req);
  };
}

export const GET = withAcceptHeader(handler);
export const POST = withAcceptHeader(handler);
export const DELETE = withAcceptHeader(handler);
