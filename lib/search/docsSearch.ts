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

  An Azure engine that isn't configured, or that fails on a request, falls
  back to Algolia, so a missing env var or an Azure outage degrades search
  instead of breaking it. Ids returned to callers are always the Agility
  content ID, whatever the engine.
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
	/** Set when Azure was asked for but failed and Algolia answered instead. */
	fallback?: string;
	/**
	 * Azure's semantic ranker score (0–4) for the best result, or null when the
	 * ranker didn't run. Below ~2.3 the docs likely don't answer the query.
	 */
	topScore?: number | null;
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
			// Separates agent searches from the search box (and the main
			// website) in Algolia's analytics for the shared index.
			analyticsTags: ["mcp"],
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

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 200);

/*
  Bursts. On 2026-11-04 one Claude conversation sent 120 searches in two
  minutes (87 in the first) and Azure answered 29 of them with 503 ("request
  rate ... exceed the limits", "not enough resources ... to cover 100% of the
  index"). Every Claude connector user reaches us from the same Anthropic proxy
  IPs (user agent Claude-User), so a per-IP rate limit would throttle all of
  them at once. Instead each instance runs at most AZURE_MAX_CONCURRENT
  searches against Azure and queues the rest. A search that waits longer than
  AZURE_QUEUE_WAIT_MS goes to Algolia, and a 503/429 gets one retry after a
  short jittered pause before falling back.
*/
const AZURE_MAX_CONCURRENT = 4;
const AZURE_QUEUE_WAIT_MS = 8000;
let azureInFlight = 0;
const azureQueue: Array<() => void> = [];

function acquireAzureSlot(): Promise<void> {
	if (azureInFlight < AZURE_MAX_CONCURRENT) {
		azureInFlight++;
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		const grant = () => {
			clearTimeout(timer);
			azureInFlight++;
			resolve();
		};
		const timer = setTimeout(() => {
			azureQueue.splice(azureQueue.indexOf(grant), 1);
			reject(new Error(`Azure busy: waited ${AZURE_QUEUE_WAIT_MS} ms for a search slot`));
		}, AZURE_QUEUE_WAIT_MS);
		azureQueue.push(grant);
	});
}

function releaseAzureSlot() {
	azureInFlight--;
	azureQueue.shift()?.();
}

const isThrottled = (err: unknown) => [429, 503].includes((err as { status?: number }).status ?? 0);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function searchAzureThrottled(query: string, page: number): Promise<DocsSearchResult> {
	await acquireAzureSlot();
	try {
		try {
			return await searchAzure(query, page, PAGE_SIZE);
		} catch (err) {
			if (!isThrottled(err)) throw err;
			await pause(400 + Math.random() * 500);
			return await searchAzure(query, page, PAGE_SIZE);
		}
	} finally {
		releaseAzureSlot();
	}
}

export async function searchDocs(query: string, page = 0): Promise<DocsSearchResult> {
	if (docsSearchEngine() !== "azure") return searchAlgolia(query, page);
	try {
		return await searchAzureThrottled(query, page);
	} catch (err) {
		console.error("Azure docs search failed; answering from Algolia", err);
		return { ...(await searchAlgolia(query, page)), fallback: message(err) };
	}
}

/** The page path (e.g. "/editors/scheduling") for an article id, or null. */
export async function docUrl(articleId: string): Promise<string | null> {
	if (docsSearchEngine() === "azure") {
		// Not found in Azure (or Azure failed): Algolia may still know it.
		try {
			const url = await azureArticleUrl(articleId);
			if (url) return url;
		} catch (err) {
			console.error("Azure article lookup failed; trying Algolia", err);
		}
	}
	const objectID = isSectionIndex() ? `${articleId}-0` : articleId;
	try {
		const doc: any = await algolia().getObject({ indexName: algoliaIndex(), objectID, attributesToRetrieve: ["url"] });
		return doc?.url ?? null;
	} catch {
		return null;
	}
}
