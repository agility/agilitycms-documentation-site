import type { SectionRecord } from "utils/searchUtils";
import type { DocsSearchResult } from "./docsSearch";

/*
  Azure AI Search for the docs: one document per article section, searched
  with keyword + vector + the semantic ranker. The index embeds queries itself
  (an Azure OpenAI vectorizer), so searching needs only the query key; writing
  needs the admin key plus the Azure OpenAI key to embed sections.

  Everything is plain REST: two endpoints and no SDK keeps the route bundle
  small and the API version pinned. See evals/search for why this setup.
*/

const API_VERSION = "2024-07-01";
const DIMENSIONS = 3072; // text-embedding-3-large
const SEMANTIC_CONFIG = "docs-semantic";

const env = (name: string) => process.env[name] || "";
const config = () => ({
	endpoint: env("AZURE_SEARCH_ENDPOINT").replace(/\/$/, ""),
	index: env("AZURE_SEARCH_INDEX") || "agility-docs-sections",
	adminKey: env("AZURE_SEARCH_ADMIN_KEY"),
	queryKey: env("AZURE_SEARCH_QUERY_KEY") || env("AZURE_SEARCH_ADMIN_KEY"),
	openAiEndpoint: env("AZURE_OPENAI_ENDPOINT").replace(/\/$/, ""),
	openAiKey: env("AZURE_OPENAI_API_KEY"),
	embeddingDeployment: env("AZURE_OPENAI_EMBEDDING_DEPLOYMENT") || "text-embedding-3-large",
});

/** Can this deployment search Azure? */
export const azureSearchConfigured = () => Boolean(config().endpoint && config().queryKey);

/** Can this deployment write to Azure (admin key and embeddings)? */
export const azureIndexingConfigured = () => {
	const c = config();
	return Boolean(c.endpoint && c.adminKey && c.openAiEndpoint && c.openAiKey);
};

async function azure(path: string, init: { method?: string; body?: unknown; admin?: boolean } = {}) {
	const c = config();
	const res = await fetch(`${c.endpoint}${path}${path.includes("?") ? "&" : "?"}api-version=${API_VERSION}`, {
		method: init.method || "GET",
		headers: { "api-key": init.admin ? c.adminKey : c.queryKey, "content-type": "application/json" },
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
		cache: "no-store",
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(`Azure AI Search ${init.method || "GET"} ${path.split("?")[0]}: ${res.status} ${(await res.text()).slice(0, 300)}`);
	}
	return res.status === 204 || res.status === 404 ? null : res.json();
}

const indexDefinition = () => {
	const c = config();
	const text = (name: string, extra: object = {}) => ({ name, type: "Edm.String", ...extra });
	return {
		name: c.index,
		fields: [
			text("objectID", { key: true, filterable: true }),
			text("articleId", { filterable: true }),
			{ name: "position", type: "Edm.Int32", filterable: true, sortable: true },
			text("title", { searchable: true, analyzer: "en.microsoft" }),
			text("heading", { searchable: true, analyzer: "en.microsoft" }),
			text("description", { searchable: true, analyzer: "en.microsoft" }),
			text("body", { searchable: true, analyzer: "en.microsoft" }),
			text("section", { searchable: true, filterable: true, facetable: true }),
			text("concept", { filterable: true }),
			text("category", { filterable: true, facetable: true }),
			text("url", { filterable: true }),
			text("hash"),
			{
				name: "bodyVector",
				type: "Collection(Edm.Single)",
				searchable: true,
				retrievable: false,
				dimensions: DIMENSIONS,
				vectorSearchProfile: "docs-vector",
			},
		],
		vectorSearch: {
			algorithms: [{ name: "docs-hnsw", kind: "hnsw", hnswParameters: { metric: "cosine" } }],
			vectorizers: [
				{
					name: "docs-openai",
					kind: "azureOpenAI",
					azureOpenAIParameters: {
						resourceUri: c.openAiEndpoint,
						deploymentId: c.embeddingDeployment,
						modelName: c.embeddingDeployment,
						apiKey: c.openAiKey,
					},
				},
			],
			profiles: [{ name: "docs-vector", algorithm: "docs-hnsw", vectorizer: "docs-openai" }],
		},
		semantic: {
			defaultConfiguration: SEMANTIC_CONFIG,
			configurations: [
				{
					name: SEMANTIC_CONFIG,
					prioritizedFields: {
						titleField: { fieldName: "title" },
						prioritizedContentFields: [{ fieldName: "body" }],
						prioritizedKeywordsFields: [{ fieldName: "heading" }, { fieldName: "section" }],
					},
				},
			],
		},
	};
};

/** Create or update the index definition (idempotent for additive changes). */
export async function ensureAzureIndex() {
	await azure(`/indexes/${config().index}`, { method: "PUT", body: indexDefinition(), admin: true });
}

// Azure rejects a whole batch if a document has a property the index doesn't
// define, so send exactly the indexed fields (records also carry itemOrder).
const indexFields = (r: SectionRecord, hash: string) => ({
	objectID: r.objectID,
	articleId: r.articleId,
	position: r.position,
	title: r.title,
	heading: r.heading,
	description: r.description,
	body: r.body,
	section: r.section,
	concept: r.concept,
	category: r.category,
	url: r.url,
	hash,
});

// A section is embedded with its context, so "Configuration" under
// "Deploy to Azure" doesn't look like every other "Configuration".
const embeddingInput = (r: SectionRecord) => `${r.title}${r.heading ? ` > ${r.heading}` : ""}\n\n${r.body}`.slice(0, 24000);

async function embed(inputs: string[]): Promise<number[][]> {
	const c = config();
	for (let attempt = 0; attempt < 6; attempt++) {
		const res = await fetch(
			`${c.openAiEndpoint}/openai/deployments/${c.embeddingDeployment}/embeddings?api-version=2024-10-21`,
			{
				method: "POST",
				headers: { "api-key": c.openAiKey, "content-type": "application/json" },
				body: JSON.stringify({ input: inputs }),
			}
		);
		if (res.status === 429) {
			await new Promise((r) => setTimeout(r, Number(res.headers.get("retry-after") || 5) * 1000));
			continue;
		}
		if (!res.ok) throw new Error(`Azure OpenAI embeddings: ${res.status} ${(await res.text()).slice(0, 300)}`);
		const json = await res.json();
		return json.data.map((d: { embedding: number[] }) => d.embedding);
	}
	throw new Error("Azure OpenAI embeddings: still rate limited after retries");
}

// Identifies a section's embedded text, so a rebuild can skip sections whose
// text hasn't changed instead of paying to embed them again.
async function hashOf(text: string) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Embed and upload sections: batches of 32 inputs, 4 in flight, each group
 * uploaded as soon as it's embedded. So a run cut short by a timeout keeps its
 * progress, and the next run (which skips unchanged sections) finishes the job.
 */
export async function upsertAzureSections(records: SectionRecord[]) {
	const hashes = await Promise.all(records.map((r) => hashOf(embeddingInput(r))));
	const batches: number[][] = [];
	for (let i = 0; i < records.length; i += 32) batches.push(records.slice(i, i + 32).map((_, j) => i + j));
	for (let i = 0; i < batches.length; i += 4) {
		const group = batches.slice(i, i + 4);
		const vectors = await Promise.all(group.map((b) => embed(b.map((k) => embeddingInput(records[k])))));
		const value = group.flatMap((b, g) =>
			b.map((k, j) => ({ "@search.action": "mergeOrUpload", ...indexFields(records[k], hashes[k]), bodyVector: vectors[g][j] }))
		);
		await azure(`/indexes/${config().index}/docs/index`, { method: "POST", body: { value }, admin: true });
	}
}

async function allDocs(filter?: string): Promise<{ objectID: string; hash?: string }[]> {
	const docs: { objectID: string; hash?: string }[] = [];
	for (let skip = 0; ; skip += 1000) {
		const page = await azure(`/indexes/${config().index}/docs/search`, {
			method: "POST",
			body: { search: "*", select: "objectID,hash", top: 1000, skip, ...(filter ? { filter } : {}) },
			admin: true,
		});
		const value: { objectID: string; hash?: string }[] = page?.value || [];
		docs.push(...value);
		if (value.length < 1000) return docs;
	}
}

async function deleteKeys(keys: string[]) {
	for (let i = 0; i < keys.length; i += 500) {
		const value = keys.slice(i, i + 500).map((objectID) => ({ "@search.action": "delete", objectID }));
		await azure(`/indexes/${config().index}/docs/index`, { method: "POST", body: { value }, admin: true });
	}
}

/** Remove every section of one article. */
export async function deleteAzureArticle(articleId: string) {
	await deleteKeys((await allDocs(`articleId eq '${articleId.replace(/'/g, "''")}'`)).map((d) => d.objectID));
}

/** Replace one article's sections (a section count can shrink between publishes). */
export async function replaceAzureArticle(articleId: string, records: SectionRecord[]) {
	await deleteAzureArticle(articleId);
	await upsertAzureSections(records);
}

/**
 * Full rebuild: embed only new or changed sections, then delete documents no
 * longer present. A no-change rebuild embeds nothing.
 */
export async function replaceAllAzure(records: SectionRecord[]) {
	await ensureAzureIndex();
	const existing = new Map((await allDocs()).map((d) => [d.objectID, d.hash]));
	const hashes = await Promise.all(records.map((r) => hashOf(embeddingInput(r))));
	const changed = records.filter((r, i) => existing.get(r.objectID) !== hashes[i]);
	await upsertAzureSections(changed);
	const keep = new Set(records.map((r) => r.objectID));
	const stale = Array.from(existing.keys()).filter((k) => !keep.has(k));
	await deleteKeys(stale);
	return { sections: records.length, embedded: changed.length, unchanged: records.length - changed.length, deleted: stale.length };
}

type AzureHit = SectionRecord & {
	"@search.rerankerScore"?: number;
	"@search.captions"?: { text?: string }[];
};

/**
 * Hybrid (keyword + vector) search with the semantic ranker, collapsed to one
 * result per article. `score` is the semantic reranker score of the best
 * section (0 to 4); low scores mean the docs likely don't answer the query.
 */
export async function searchAzure(query: string, page: number, pageSize: number): Promise<DocsSearchResult> {
	const res = await azure(`/indexes/${config().index}/docs/search`, {
		method: "POST",
		body: {
			search: query,
			queryType: "semantic",
			semanticConfiguration: SEMANTIC_CONFIG,
			captions: "extractive",
			vectorQueries: [{ kind: "text", text: query, fields: "bodyVector", k: 50 }],
			select: "articleId,title,heading,description,body,section,category,url",
			top: 50,
		},
	});
	const byArticle = new Map<string, AzureHit>();
	for (const hit of (res?.value || []) as AzureHit[]) if (!byArticle.has(hit.articleId)) byArticle.set(hit.articleId, hit);
	const all = Array.from(byArticle.values());
	return {
		engine: "azure",
		total: all.length,
		page,
		pages: Math.max(1, Math.ceil(all.length / pageSize)),
		hits: all.slice(page * pageSize, (page + 1) * pageSize).map((h) => ({
			articleId: h.articleId,
			title: h.title,
			url: h.url,
			category: h.category,
			section: h.section,
			description: h.description,
			heading: h.heading || null,
			snippet: h["@search.captions"]?.[0]?.text || h.body.slice(0, 300),
			score: h["@search.rerankerScore"] ?? null,
		})),
	};
}

/** The page URL for an article id, or null. */
export async function azureArticleUrl(articleId: string): Promise<string | null> {
	const res = await azure(`/indexes/${config().index}/docs/search`, {
		method: "POST",
		body: { search: "*", filter: `articleId eq '${articleId.replace(/'/g, "''")}'`, select: "url", top: 1 },
	});
	return res?.value?.[0]?.url ?? null;
}
