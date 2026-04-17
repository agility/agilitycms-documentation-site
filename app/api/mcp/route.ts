// @ts-nocheck — Zod v3 + McpServer.tool() causes infinite type recursion
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import algoliasearch from "algoliasearch";

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
        try {
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

          return {
            content: [
              {
                type: "text" as const,
                text: lines.join("\n"),
              },
            ],
          };
        } catch {
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
        try {
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

          return {
            content: [
              {
                type: "text" as const,
                text: lines.join("\n"),
              },
            ],
          };
        } catch {
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

export { handler as GET, handler as POST, handler as DELETE };
