/**
 * The APIs the reference and explorer cover.
 *
 * REGIONS
 * -------
 * An Agility instance GUID ends in a region suffix, and both APIs are
 * addressed on a per-region host derived from it. The two naming schemes are
 * symmetric (`api-eu` / `mgmt-eu`), and all twelve hosts were verified to
 * serve their swagger.json on 2026-09-20. Getting this wrong doesn't fail
 * loudly — it returns 401s against the wrong region's data — so the suffix is
 * always read off the GUID rather than assumed to be US.
 */

export type ApiId = "fetch" | "management";

/** GUID suffix -> region host infix. `-u` (US) is the unsuffixed default. */
const REGION_INFIX: Record<string, string> = {
	u: "",
	c: "-ca",
	e: "-eu",
	a: "-aus",
	us2: "-usa2",
	d: "-dev",
};

/**
 * Region infix for an instance GUID, e.g. `67bc73e6-u` -> "" and
 * `abc12345-e` -> "-eu". Unknown suffixes fall back to US, which is what every
 * Agility SDK does.
 */
export const regionInfix = (guid: string): string => {
	const suffix = (guid || "").split("-").pop()?.toLowerCase() || "u";
	return REGION_INFIX[suffix] ?? "";
};

export const fetchApiHost = (guid: string): string => `https://api${regionInfix(guid)}.aglty.io`;
export const managementApiHost = (guid: string): string =>
	`https://mgmt${regionInfix(guid)}.aglty.io`;

export interface ApiDefinition {
	id: ApiId;
	/** URL segment under /docs/api-reference/. */
	slug: string;
	title: string;
	/** One line, used on cards, metadata and JSON-LD. */
	tagline: string;
	description: string;
	/** Live spec, re-read on the cache's schedule. */
	specUrl: string;
	/** Default (US) host, for display in examples. */
	defaultHost: string;
	host: (guid: string) => string;
	/** How the explorer authenticates a call. */
	auth: "apiKey" | "oauth";
	/** Whether the explorer may issue non-GET requests against this API. */
	allowWrites: boolean;
	/** The hand-written article that introduces this API, if any. */
	conceptualDocPath?: string;
}

export const API_REGISTRY: Record<ApiId, ApiDefinition> = {
	fetch: {
		id: "fetch",
		slug: "fetch",
		title: "Content Fetch API",
		tagline: "Read published and preview content over REST.",
		description:
			"The Content Fetch API is the read side of Agility CMS. It serves published content through the `fetch` API type and unpublished content through `preview`, addressed by instance GUID, locale and content reference name. Authentication is a single API key sent in the `APIKey` header.",
		specUrl: "https://api.aglty.io/swagger/v1/swagger.json",
		defaultHost: "https://api.aglty.io",
		host: fetchApiHost,
		auth: "apiKey",
		// Every operation in this spec is a GET; there is nothing to write.
		allowWrites: true,
		conceptualDocPath: "/developers/content-fetch-api",
	},
	management: {
		id: "management",
		slug: "management",
		title: "Management API",
		tagline: "Create, update and publish content, pages, models and assets.",
		description:
			"The Management API is the write side of Agility CMS. It covers content items, pages, containers, models, assets, locales, webhooks and users, and authenticates with an OAuth 2.0 access token or a Personal Access Token.",
		specUrl: "https://mgmt.aglty.io/swagger/v1/swagger.json",
		defaultHost: "https://mgmt.aglty.io",
		host: managementApiHost,
		auth: "oauth",
		// v1 is READ-ONLY in the explorer, by product decision: a mis-click here
		// lands on a customer's live instance. The reference still documents
		// every operation — only the "try it" runner is restricted, which
		// buildRunnableOperations enforces.
		allowWrites: false,
		conceptualDocPath: "/developers/content-management-api",
	},
};

export const API_LIST: ApiDefinition[] = [API_REGISTRY.fetch, API_REGISTRY.management];

export const isApiId = (value: string): value is ApiId => value in API_REGISTRY;
