import "server-only";

import { cookies } from "next/headers";

/**
 * Server-side reader for the signed-in Agility session, shared by the API
 * explorer routes.
 *
 * WHY NOT OAUTH (for the Fetch explorer)
 * --------------------------------------
 * The obvious route to "let people try this against their own instance" is the
 * Management API's OAuth flow. It isn't needed here, and skipping it removes a
 * whole redirect dance plus a long-lived write-capable token from the browser.
 *
 * Classic CM's `GetCurrentServerUser` — already called by /api/me to validate
 * the session — returns the full ServerUser DTO, and that DTO carries
 * `websiteAccess`: every instance the signed-in user can reach, with its GUID.
 * So the instance list comes from a cookie the visitor already has, and the
 * Fetch explorer needs no token at all.
 *
 * The Management explorer WILL need OAuth, because its calls are authorized
 * per-request by a bearer token. That is deliberately a later phase.
 *
 * WHAT THIS DELIBERATELY NEVER RETURNS
 * ------------------------------------
 * The upstream payload is ~47KB and includes the email address, last name and
 * internal-user flags. Only the id, first name and the instance list
 * (guid / display name / org / dormant flag) cross back to the browser.
 */

/** Owned by Classic CM's OWIN config, not this repo — hence overridable. */
const AUTH_COOKIE = process.env.AGILITY_AUTH_COOKIE_NAME || "AgilityAuthOWIN";

/**
 * Classic Content Manager base URL, e.g. `https://manager.agilitycms.com`.
 * UNSET disables the instance picker entirely — there is no way to learn which
 * instances someone can reach without asking Classic, and guessing is not an
 * option when the answer gates an API key.
 */
const MANAGER_URL = process.env.AGILITY_MANAGER_URL;

const TIMEOUT_MS = 4000;

export interface ExplorerInstance {
	guid: string;
	displayName: string;
	orgName?: string;
	/** Dormant instances answer API calls with errors — worth greying out. */
	isDormant?: boolean;
}

export interface ExplorerSession {
	signedIn: boolean;
	/** False when AGILITY_MANAGER_URL is unset, or Classic couldn't be reached. */
	resolved: boolean;
	firstName?: string;
	instances: ExplorerInstance[];
}

const SIGNED_OUT: ExplorerSession = { signedIn: false, resolved: true, instances: [] };

/**
 * Read the caller's session and the instances they can reach.
 *
 * `redirect: "manual"` is load-bearing, exactly as in /api/me: a bogus cookie
 * gets a 302 to the login page, and fetch would otherwise follow it and hand
 * back a 200, reading an invalid session as valid.
 */
export const getExplorerSession = async (): Promise<ExplorerSession> => {
	const cookieStore = await cookies();
	const value = cookieStore.get(AUTH_COOKIE)?.value;
	if (!value) return SIGNED_OUT;

	// Presence-only mode: we know someone is signed in but cannot enumerate
	// their instances, so the picker falls back to a manual GUID entry.
	if (!MANAGER_URL) return { signedIn: true, resolved: false, instances: [] };

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(`${MANAGER_URL.replace(/\/$/, "")}/json/User/GetCurrentServerUser`, {
			method: "POST",
			headers: {
				// Forward ONLY the auth cookie — never the visitor's whole jar.
				Cookie: `${AUTH_COOKIE}=${value}`,
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": "0",
			},
			redirect: "manual",
			cache: "no-store",
			signal: controller.signal,
		});

		if (res.status === 302 || res.status === 401 || res.status === 403) return SIGNED_OUT;
		if (!res.ok) return { signedIn: true, resolved: false, instances: [] };

		const body = (await res.json().catch(() => null)) as {
			IsError?: boolean;
			ResponseData?: {
				FirstName?: string;
				WebsiteAccess?: RawWebsite[];
				websiteAccess?: RawWebsite[];
			};
		} | null;

		if (!body || body.IsError === true) return SIGNED_OUT;

		const data = body.ResponseData;
		// Classic is a .NET app and has historically been inconsistent about JSON
		// casing across endpoints, so both spellings are accepted rather than
		// silently yielding an empty instance list.
		const raw = data?.WebsiteAccess || data?.websiteAccess || [];

		return {
			signedIn: true,
			resolved: true,
			firstName: data?.FirstName?.trim() || undefined,
			instances: raw.map(normalizeWebsite).filter((i): i is ExplorerInstance => i !== null),
		};
	} catch {
		return { signedIn: true, resolved: false, instances: [] };
	} finally {
		clearTimeout(timer);
	}
};

interface RawWebsite {
	Guid?: string;
	guid?: string;
	DisplayName?: string;
	displayName?: string;
	WebsiteName?: string;
	websiteName?: string;
	OrgName?: string;
	orgName?: string;
	IsDormant?: boolean;
	isDormant?: boolean;
}

const normalizeWebsite = (w: RawWebsite): ExplorerInstance | null => {
	const guid = (w.Guid || w.guid || "").trim();
	if (!guid) return null;
	const displayName = (w.DisplayName || w.displayName || w.WebsiteName || w.websiteName || guid).trim();
	return {
		guid,
		displayName,
		orgName: (w.OrgName || w.orgName || "").trim() || undefined,
		isDormant: w.IsDormant ?? w.isDormant ?? false,
	};
};

/**
 * Does the signed-in caller actually have access to this instance?
 *
 * This is the gate on key issuance. It matters because the upstream endpoint
 * has none: `GET mgmt.aglty.io/oauth/getfetchkey?guid=…` returns a live Fetch
 * API key for ANY guid with no authentication at all (verified 2026-09-20).
 * Fetch keys are low-sensitivity by design — they ship in the client bundle of
 * every Agility-backed site — but that is no reason for the documentation site
 * to add a second, friendlier key oracle to the internet. We only ever hand
 * back a key for an instance the caller can already open in the CMS.
 */
export const canAccessInstance = async (guid: string): Promise<boolean> => {
	if (!guid) return false;
	const session = await getExplorerSession();
	if (!session.signedIn || !session.resolved) return false;
	return session.instances.some((i) => i.guid.toLowerCase() === guid.toLowerCase());
};
