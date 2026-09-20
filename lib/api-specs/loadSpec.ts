import fetchSnapshot from "lib/api-specs/snapshots/fetch.json";
import managementSnapshot from "lib/api-specs/snapshots/management.json";
import { buildOperations } from "lib/api-specs/operations";
import { API_LIST, ApiId } from "lib/api-specs/registry";
import { ApiOperation, OpenApiDocument } from "lib/api-specs/types";

/**
 * OpenAPI specs for the API reference — read from CHECKED-IN SNAPSHOTS, not
 * from the live spec endpoints.
 *
 * WHY NOT FETCH THE LIVE SPEC
 * ---------------------------
 * The first version of this did fetch live (in a `'use cache'` scope, with the
 * snapshot as a fallback). Three things argued it back out, in increasing
 * order of importance:
 *
 * 1. It made our build depend on a third party's uptime. A slow or down
 *    mgmt.aglty.io during a deploy is their incident, and it should not be able
 *    to become ours.
 *
 * 2. The set of operation slugs IS A PUBLIC URL CONTRACT. 126 URLs are in
 *    sitemap.xml, in llms.txt, and indexed. Deriving them from a live document
 *    means a vendor deploy can add or remove pages from this site at 3am with
 *    no review. A snapshot makes changing the URL surface a pull request, which
 *    is what it should be.
 *
 * 3. Cache Components has no way to say "404 this param without rendering"
 *    (`dynamicParams` is rejected outright), so proxy.ts has to reject unknown
 *    operation slugs before they reach a render — see the note there. That
 *    check and these pages MUST agree on the slug set, and the only way to
 *    guarantee that is for both to read the same file. With a live fetch they
 *    could disagree for a day at a time, and the symptom would be a 500.
 *
 * Nothing here is async or cached, because nothing here does IO — which also
 * means there is no way for this module to postpone a route.
 *
 * KEEPING THE SNAPSHOTS HONEST
 * ----------------------------
 * `npm run specs:refresh` re-downloads both specs; the api-spec-drift skill
 * (.claude/skills/api-spec-drift) reports when the live specs have moved past
 * what is checked in. Refreshing is a deliberate, reviewable change — and a
 * newly added endpoint wants a prose pass before it is published anyway.
 */

const SNAPSHOTS: Record<ApiId, OpenApiDocument> = {
	fetch: fetchSnapshot as OpenApiDocument,
	management: managementSnapshot as OpenApiDocument,
};

export const getSpec = (apiId: ApiId): OpenApiDocument => SNAPSHOTS[apiId];

/**
 * Operations are derived once per process and memoised. `buildOperations`
 * validates that no two operations claim the same slug and throws if they do —
 * here that is a genuine bug in this repo (someone refreshed a snapshot whose
 * shape the slug rule doesn't cover) and should fail the build, loudly.
 */
const cache = new Map<ApiId, ApiOperation[]>();

export const getOperations = (apiId: ApiId): ApiOperation[] => {
	const cached = cache.get(apiId);
	if (cached) return cached;
	const operations = buildOperations(SNAPSHOTS[apiId]);
	cache.set(apiId, operations);
	return operations;
};

export const getOperation = (apiId: ApiId, slug: string): ApiOperation | undefined =>
	getOperations(apiId).find((op) => op.slug === slug);

/**
 * Every valid `/api-reference/…` path, for the proxy's 404 check. Includes the
 * index and the two API landings alongside the operation pages.
 */
export const apiReferencePaths = (): Set<string> => {
	const paths = new Set<string>(["/api-reference"]);
	for (const api of API_LIST) {
		paths.add(`/api-reference/${api.slug}`);
		for (const op of getOperations(api.id)) paths.add(`/api-reference/${api.slug}/${op.slug}`);
	}
	return paths;
};
