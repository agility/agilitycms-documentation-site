import { API_REGISTRY, ApiId } from "lib/api-specs/registry";
import { ApiOperation } from "lib/api-specs/types";

/**
 * Which operations the "try it" runner is allowed to execute.
 *
 * This is the security boundary of the explorer, so it is an ALLOWLIST
 * evaluated server-side on every request — never a UI-only restriction. The
 * client picks an operation by slug and the server decides, independently,
 * whether that slug may run at all.
 *
 * THREE RULES, AND WHY EACH ONE EXISTS
 *
 * 1. **GET only.** Read-only in v1 by product decision: a mis-click in a
 *    documentation page should not be able to change a customer's live
 *    content. The reference still documents all 115 Management operations;
 *    only the runner is restricted.
 *
 * 2. **`/api/v1/` only — which excludes every `/oauth/` path.** Not a
 *    formality. `/oauth/getpreviewkey` and `/oauth/getfetchkey` are
 *    unauthenticated key-disclosure endpoints (verified 2026-09-20), and a
 *    preview key reads unpublished content. Making them runnable would turn
 *    the docs site into a friendly UI for handing out other instances' keys —
 *    precisely what /api/explorer/fetch-key is written to avoid.
 *    `/oauth/authorize` and `/oauth/callback` are browser redirects, not JSON
 *    APIs, and would do nothing useful here anyway.
 *
 * 3. **No `/api/v1/tokens`.** Personal Access Token management is
 *    account-level credential administration, not something to demonstrate in
 *    a playground. The list endpoint returns metadata rather than token
 *    values, so this is caution rather than a known leak.
 */
const isRunnableManagementPath = (path: string): boolean =>
	path.startsWith("/api/v1/") && !path.startsWith("/api/v1/tokens");

export const isRunnable = (apiId: ApiId, operation: ApiOperation): boolean => {
	if (operation.method !== "get") return false;
	if (apiId === "fetch") return true;
	return isRunnableManagementPath(operation.path);
};

/**
 * Why an operation can't be run, for the panel to show instead of a form.
 * Phrased for a reader deciding whether to go and use curl, so it says what
 * the limit is rather than just that there is one.
 */
export const notRunnableReason = (apiId: ApiId, operation: ApiOperation): string => {
	if (operation.method !== "get") {
		return `${operation.method.toUpperCase()} operations can't be run from the docs — the explorer is read-only, so a mis-click here can't change your live content. Copy the request and run it against your own instance.`;
	}
	if (apiId === "management" && operation.path.startsWith("/oauth/")) {
		return "This is part of the authentication flow rather than a JSON endpoint, so there's nothing useful to run here.";
	}
	if (apiId === "management" && operation.path.startsWith("/api/v1/tokens")) {
		return "Personal Access Tokens are managed in the CMS rather than from the docs.";
	}
	return "This operation can't be run from the browser.";
};

/**
 * Does this operation act on a specific instance?
 *
 * Instance-scoped operations take their `{guid}` from the instance picker and
 * are authorized against the caller's own WebsiteAccess. The handful that
 * aren't — `/api/v1/users/me`, `/api/v1/types` — act on the caller or on
 * static reference data, so they need no instance and no picker.
 */
export const isInstanceScoped = (operation: ApiOperation): boolean =>
	operation.path.includes("{guid}");

/** Transport for an API's runner: direct from the browser, or server-proxied. */
export const transportFor = (apiId: ApiId): "direct" | "proxy" =>
	API_REGISTRY[apiId].auth === "apiKey" ? "direct" : "proxy";
