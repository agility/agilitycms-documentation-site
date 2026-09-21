import { ApiOperation, HTTP_METHODS, HttpMethod, OpenApiDocument } from "lib/api-specs/types";

/**
 * Turn an OpenAPI document into the flat, slugged operation list the reference
 * pages and the explorer are built from.
 *
 * WHY SLUGS ARE DERIVED, AND WHY THE RULE IS FUSSY
 * ------------------------------------------------
 * Neither Agility spec carries a single `operationId` — 0 of 130 operations in
 * both the Fetch and Management specs (checked 2026-09-20). An operationId is
 * normally what a generated reference hangs its URLs off, so the slug has to
 * come from the method and path instead, and it has to be STABLE: these become
 * public URLs that get linked and indexed.
 *
 * The rule, in order:
 *
 *  1. `/v1`-prefixed paths that duplicate an unprefixed twin are folded in as
 *     aliases, not separate operations. The Fetch API publishes five of these;
 *     documenting both would be two pages competing for one query.
 *  2. The base slug is the method plus every LITERAL path segment, dropping the
 *     `api`/`v1` routing noise. Templated segments are skipped, because
 *     `{referenceName}` says nothing about what the operation does.
 *  3. Where that collides, only the variants ENDING in a templated segment take
 *     a `-by-<param>` suffix; the one that doesn't keeps the bare base.
 *
 * Rule 3 is the subtle one. The obvious alternative — suffixing the collection
 * form with `-list` — collides in the Management spec, where `/asset` (the
 * collection) and `/asset/list` (a literal segment) would both want
 * `get-instance-asset-list`. Leaving the non-templated variant on its base slug
 * avoids inventing a suffix that the spec might already use as a real segment.
 *
 * Verified collision-free over both specs: 11 Fetch + 115 Management = 126
 * slugs, 0 collisions. `assertNoCollisions` re-checks at load time so a spec
 * revision that breaks it fails loudly instead of silently serving one
 * operation's page for two operations.
 */

/** `referenceName` -> `reference-name`, for readable `-by-` suffixes. */
const kebabCase = (s: string): string =>
	s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Method + literal path segments, minus routing noise. */
const baseSlug = (method: HttpMethod, path: string): string => {
	const segments = path
		.split("/")
		.filter((s) => s && !s.startsWith("{"))
		.filter((s) => s !== "api" && s !== "v1");
	return segments.length > 0 ? `${method}-${segments.join("-")}`.toLowerCase() : method;
};

const endsInParam = (path: string): boolean => {
	const last = path.split("/").filter(Boolean).pop() || "";
	return last.startsWith("{");
};

const trailingParam = (path: string): string => {
	const last = path.split("/").filter(Boolean).pop() || "";
	return kebabCase(last.slice(1, -1));
};

export const buildOperations = (spec: OpenApiDocument): ApiOperation[] => {
	const raw: { method: HttpMethod; path: string; operation: any }[] = [];
	for (const [path, methods] of Object.entries(spec.paths || {})) {
		for (const method of HTTP_METHODS) {
			const operation = (methods as any)[method];
			if (operation) raw.push({ method, path, operation });
		}
	}

	// 1. Fold /v1-prefixed duplicates into their unprefixed twin as aliases.
	const present = new Set(raw.map((r) => `${r.method} ${r.path}`));
	const aliasesFor = new Map<string, string[]>();
	const canonical = raw.filter(({ method, path }) => {
		if (!path.startsWith("/v1/")) return true;
		const twin = path.slice(3);
		if (!present.has(`${method} ${twin}`)) return true; // no twin — a real route
		const key = `${method} ${twin}`;
		aliasesFor.set(key, [...(aliasesFor.get(key) || []), path]);
		return false;
	});

	// 2 + 3. Base slug, then disambiguate only the templated-tail variants.
	const byBase = new Map<string, typeof canonical>();
	for (const entry of canonical) {
		const base = baseSlug(entry.method, entry.path);
		byBase.set(base, [...(byBase.get(base) || []), entry]);
	}

	// Array.from rather than iterating the Map directly — tsconfig targets es5,
	// which can't downlevel a Map iterator (same reason getRichSnippet does it).
	const operations: ApiOperation[] = [];
	for (const [base, entries] of Array.from(byBase.entries())) {
		for (const { method, path, operation } of entries) {
			const slug =
				entries.length > 1 && endsInParam(path) ? `${base}-by-${trailingParam(path)}` : base;
			operations.push({
				slug,
				method,
				path,
				aliases: aliasesFor.get(`${method} ${path}`) || [],
				tag: operation.tags?.[0] || "Other",
				summary: operation.summary?.replace(/\s+/g, " ").trim() || "",
				operation,
			});
		}
	}

	assertNoCollisions(operations, spec.info?.title || "spec");
	return operations.sort((a, b) => a.tag.localeCompare(b.tag) || a.slug.localeCompare(b.slug));
};

/**
 * A slug collision would make two operations share one public URL — one of
 * them silently unreachable. Cheap to check, expensive to discover in
 * production, so it throws rather than warns.
 */
const assertNoCollisions = (operations: ApiOperation[], specName: string): void => {
	const seen = new Map<string, string>();
	for (const op of operations) {
		const id = `${op.method.toUpperCase()} ${op.path}`;
		const prior = seen.get(op.slug);
		if (prior) {
			throw new Error(
				`[api-specs] Slug collision in ${specName}: "${op.slug}" is claimed by both ` +
					`${prior} and ${id}. The spec changed shape — extend the slug rule in ` +
					`lib/api-specs/operations.ts and re-run the reference build.`
			);
		}
		seen.set(op.slug, id);
	}
};

/** Group operations by their first tag, preserving the sorted order. */
export const groupByTag = (operations: ApiOperation[]): Map<string, ApiOperation[]> => {
	const groups = new Map<string, ApiOperation[]>();
	for (const op of operations) {
		groups.set(op.tag, [...(groups.get(op.tag) || []), op]);
	}
	return groups;
};
