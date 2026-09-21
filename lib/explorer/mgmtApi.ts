import "server-only";

import { classicCall } from "lib/explorer/classicCall";

/**
 * Management API access from the signed-in visitor's cookie.
 *
 * The Manager app's `mgmtAPICall` does this in two steps, and the first one is
 * the interesting one: `POST {managerUrl}/json/User/GetAccessToken` exchanges
 * the Classic session cookie for a Management API bearer token. No OAuth
 * redirect, no client registration — if you can prove you're signed in, you can
 * mint a token.
 *
 * That matters beyond locales: it is also the route by which a future
 * Management API explorer could work without the `/oauth/authorize` dance.
 *
 * ⚠️ The token is a WRITE-CAPABLE credential for every instance the user can
 * reach. It is used server-side for the duration of one request and is never
 * returned to the browser — unlike the fetch key, there is no version of this
 * that would be safe to hand out.
 */

/**
 * Manager host -> regional Management API base.
 *
 * Ported from the Manager app's `getMgmtAPIUrl`, with one deliberate
 * difference: it tests `includes("manager-us2")`, but the host in every
 * WebsiteAccess record is `manager-usa2`, which does not contain that string —
 * so USA2 instances silently fall through to the US API there. This matches on
 * the host that actually exists. (Worth fixing in the Manager app too.)
 */
export const getMgmtApiBase = (managerUrl: string): string => {
	const url = (managerUrl || "").toLowerCase();
	if (url.includes("manager-dev") || url.includes("manager-qa")) return "https://mgmt-dev.aglty.io/api/v1";
	if (url.includes("manager-ca")) return "https://mgmt-ca.aglty.io/api/v1";
	if (url.includes("manager-eu")) return "https://mgmt-eu.aglty.io/api/v1";
	if (url.includes("manager-aus")) return "https://mgmt-aus.aglty.io/api/v1";
	if (url.includes("manager-usa2")) return "https://mgmt-usa2.aglty.io/api/v1";
	return "https://mgmt.aglty.io/api/v1";
};

/** Exchange the Classic session cookie for a Management API bearer token. */
export const getMgmtAccessToken = async (
	managerUrl: string,
	cookieValue: string
): Promise<string | null> => {
	const token = await classicCall<string>({
		managerUrl,
		path: "/json/User/GetAccessToken",
		body: {},
		cookieValue,
	});
	return typeof token === "string" && token.trim() ? token.trim() : null;
};

/** Never let a slow Management API hold a request open. */
const TIMEOUT_MS = 10000;

/** Host root for a region, without the /api/v1 suffix. */
const mgmtHost = (managerUrl: string): string =>
	getMgmtApiBase(managerUrl).replace(/\/api\/v1$/, "");

export interface MgmtResponse {
	status: number;
	statusText: string;
	/** Raw body text, pretty-printed when it parses as JSON. */
	body: string;
	/** The URL actually requested, for the panel to display. */
	url: string;
}

/**
 * Perform one authenticated request and report what actually happened —
 * including non-2xx.
 *
 * Distinct from `mgmtGet`, which collapses every failure to null because its
 * callers only want the data. The explorer is the opposite: a 404 or a 403 IS
 * the result the reader is trying to see, so statuses are passed through
 * rather than swallowed.
 *
 * `path` is absolute from the host root (it starts `/api/v1/...`), because the
 * spec's templates are written that way.
 */
export const mgmtFetch = async (
	managerUrl: string,
	path: string,
	token: string
): Promise<MgmtResponse> => {
	const url = `${mgmtHost(managerUrl)}${path}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				"X-Requested-With": "XMLHttpRequest",
				Accept: "application/json",
			},
			cache: "no-store",
			signal: controller.signal,
		});
		const text = await res.text();
		let body = text;
		try {
			body = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			/* not JSON — show it as it came */
		}
		return { status: res.status, statusText: res.statusText, body, url };
	} finally {
		clearTimeout(timer);
	}
};

/** Authenticated GET against the regional Management API. */
export const mgmtGet = async <T>(
	managerUrl: string,
	path: string,
	token: string
): Promise<T | null> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(`${getMgmtApiBase(managerUrl)}${path}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				"X-Requested-With": "XMLHttpRequest",
			},
			cache: "no-store",
			signal: controller.signal,
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
};
