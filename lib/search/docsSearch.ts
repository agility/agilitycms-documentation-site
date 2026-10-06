import { algoliasearch } from "algoliasearch";
import { azureArticleUrl, azureSearchConfigured, searchAzure } from "./azure";

/*
  The engine behind the Knowledgebase MCP's search_docs and fetch_doc tools.
  The tools' contract (inputs and output shape) never changes; this module
  picks the engine:

    DOCS_SEARCH_ENGINE   "algolia" (default) or "azure"
    ALGOLIA_DOCS_INDEX   Algolia index to search (default "doc_site", one
                         record per article; "doc_site_sections" is one per
                         section, collapsed to one hit per article)

  An Azure engine that isn't configured falls back to Algolia, so a missing
  env var degrades search instead of breaking it. Ids returned to callers are
  always the Agility content ID, whatever the engine.
*/

export type DocsHit = {
	articleId: string;
	title: string;
	url: string;
	category: string | null;
	section: string | null;
	description: string | null;
	heading: string | null;
	snippet: string;
	score: number | null;
};

export type DocsSearchResult = {
	engine: "algolia" | "azure";
	total: number;
	page: number;
	pages: number;
	hits: DocsHit[];
};

export const PAGE_SIZE = 10;

export const docsSearchEngine = (): "algolia" | "azure" =>
	process.env.DOCS_SEARCH_ENGINE === "azure" && azureSearchConfigured() ? "azure" : "algolia";

const algoliaIndex = () => process.env.ALGOLIA_DOCS_INDEX || "doc_site";
const isSectionIndex = () => algoliaIndex() !== "doc_site";

let client: ReturnType<typeof algoliasearch> | null = null;
const algolia = () =>
	(client ??= algoliasearch(process.env.ALGOLIA_APP_ID!, process.env.ALGOLIA_ADMIN_API_KEY!));

const stripHtml = (text: string) => text.replace(/<[^>]*>/g, "");

async function searchAlgolia(query: string, page: number): Promise<DocsSearchResult> {
	const res: any = await algolia().searchSingleIndex({
		indexName: algoliaIndex(),
		searchParams: {
			query,
			page,
			hitsPerPage: PAGE_SIZE,
			// Agents ask in sentences ("how do I schedule content to publish
			// later"), and by default every word must match, so most such
			// questions returned 0 hits. Drop filler words, fold plurals, and
			// when the full query still matches nothing, let Algolia relax
			// words instead of returning an empty result.
			queryLanguages: ["en"],
			removeStopWords: true,
			ignorePlurals: true,
			removeWordsIfNoResults: "allOptional",
			attributesToSnippet: ["body:50"],
			snippetEllipsisText: "...",
			attributesToRetrieve: ["articleId", "title", "url", "description", "category", "section", "heading"],
			attributesToHighlight: [],
		},
	});
	return {
		engine: "algolia",
		total: res.nbHits,
		page: res.page,
		pages: res.nbPages,
		hits: res.hits.map((h: any) => ({
			articleId: `${h.articleId ?? h.objectID}`,
			title: h.title,
			url: h.url,
			category: h.category ?? null,
			section: h.section ?? null,
			description: h.description ?? null,
			heading: h.heading || null,
			snippet: stripHtml(h._snippetResult?.body?.value || ""),
			score: null,
		})),
	};
}

export async function searchDocs(query: string, page = 0): Promise<DocsSearchResult> {
	return docsSearchEngine() === "azure" ? searchAzure(query, page, PAGE_SIZE) : searchAlgolia(query, page);
}

/** The page path (e.g. "/editors/scheduling") for an article id, or null. */
export async function docUrl(articleId: string): Promise<string | null> {
	if (docsSearchEngine() === "azure") return azureArticleUrl(articleId);
	const objectID = isSectionIndex() ? `${articleId}-0` : articleId;
	try {
		const doc: any = await algolia().getObject({ indexName: algoliaIndex(), objectID, attributesToRetrieve: ["url"] });
		return doc?.url ?? null;
	} catch {
		return null;
	}
}
