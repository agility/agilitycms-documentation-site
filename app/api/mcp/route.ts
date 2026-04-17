// @ts-nocheck — Zod v3 + McpServer.tool() causes infinite type recursion
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import algoliasearch from "algoliasearch";

const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);
const index = algoliaClient.initIndex("doc_site");

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

          const formattedResults = results.hits.map((hit: any) => ({
            objectID: hit.objectID,
            title: hit.title,
            url: hit.url,
            description: hit.description || "",
            category: hit.category || "",
            section: hit.section || "",
            snippet: hit._snippetResult?.body?.value || "",
          }));

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    query,
                    totalHits: results.nbHits,
                    page: results.page,
                    totalPages: results.nbPages,
                    results: formattedResults,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Search failed for query '${query}'`,
                }),
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
          const doc = await index.getObject(objectID, {
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

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(doc, null, 2),
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Document with ID '${objectID}' not found`,
                }),
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
