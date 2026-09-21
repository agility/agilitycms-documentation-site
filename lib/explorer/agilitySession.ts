import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE, ClassicAuthError, DEFAULT_MANAGER_URL, classicCall } from "lib/explorer/classicCall";

/**
 * Server-side reader for the signed-in Agility session, shared by the API
 * explorer routes.
 *
 * WHY NOT OAUTH (for the Fetch explorer)
 * --------------------------------------
 * The obvious route to "let people try this against their own instance" is the
 * Management API's OAuth flow. It isn't needed, and skipping it keeps a
 * long-lived, write-capable token out of the browser entirely.
 *
 * Classic CM's `GetCurrentServerUser` — already called by /api/me to validate
 * the session — returns the full ServerUser DTO, and that DTO carries
 * `WebsiteAccess`: every instance the signed-in user can reach, with its GUID,
 * website name and regional manager URL. This is the same source the Manager
 * app reads (`useWebsiteInfo` → `serverUser.WebsiteAccess`), so the docs
 * explorer resolves instances exactly the way the product does.
 *
 * WHAT THIS DELIBERATELY NEVER RETURNS
 * ------------------------------------
 * The upstream payload is ~47KB and includes the email address, last name and
 * internal-user flags. Only the first name and the instance list cross back to
 * the browser.
 */

export interface ExplorerInstance {
	guid: string;
	/** Classic's key for the instance — what the /json/Settings/* calls want. */
	websiteName: string;
	displayName: string;
	orgName?: string;
	/** The instance's own regional Classic host; falls back to the default. */
	managerUrl: string;
	/** Dormant instances answer API calls with errors — worth greying out. */
	isDormant?: boolean;
}

export interface ExplorerSession {
	signedIn: boolean;
	/** False when Classic couldn't be reached — NOT the same as "no instances". */
	resolved: boolean;
	firstName?: string;
	instances: ExplorerInstance[];
}

const SIGNED_OUT: ExplorerSession = { signedIn: false, resolved: true, instances: [] };

/** The auth cookie value, or null when the visitor isn't signed in. */
export const getAuthCookie = async (): Promise<string | null> => {
	const cookieStore = await cookies();
	return cookieStore.get(AUTH_COOKIE)?.value || null;
};

/** Read the caller's session and the instances they can reach. */
export const getExplorerSession = async (): Promise<ExplorerSession> => {
	const cookieValue = await getAuthCookie();
	if (!cookieValue) return SIGNED_OUT;

	try {
		const data = await classicCall<{
			FirstName?: string;
			WebsiteAccess?: RawWebsite[];
			websiteAccess?: RawWebsite[];
		}>({
			path: "/json/User/GetCurrentServerUser",
			body: {},
			cookieValue,
		});

		if (!data) return { signedIn: true, resolved: false, instances: [] };

		// Classic is a .NET app and has been inconsistent about JSON casing
		// across endpoints, so both spellings are accepted rather than silently
		// yielding an empty instance list. The Manager app reads the PascalCase
		// form (serverUser.WebsiteAccess), which is the one seen in practice.
		const raw = data.WebsiteAccess || data.websiteAccess || [];

		return {
			signedIn: true,
			resolved: true,
			firstName: data.FirstName?.trim() || undefined,
			instances: raw.map(normalizeWebsite).filter((i): i is ExplorerInstance => i !== null),
		};
	} catch (err) {
		if (err instanceof ClassicAuthError) return SIGNED_OUT;
		// A network blip must not be reported as "no instances", which would
		// read to the visitor as "you don't have access to anything".
		return { signedIn: true, resolved: false, instances: [] };
	}
};

interface RawWebsite {
	Guid?: string;
	guid?: string;
	WebsiteName?: string;
	websiteName?: string;
	DisplayName?: string;
	displayName?: string;
	OrgName?: string;
	orgName?: string;
	ManagerUrl?: string;
	managerUrl?: string;
	IsDormant?: boolean;
	isDormant?: boolean;
}

const normalizeWebsite = (w: RawWebsite): ExplorerInstance | null => {
	const guid = (w.Guid || w.guid || "").trim();
	const websiteName = (w.WebsiteName || w.websiteName || "").trim();
	// Both are required: the guid addresses the Fetch API, the website name
	// addresses Classic. An entry missing either can't be used for anything.
	if (!guid || !websiteName) return null;

	return {
		guid,
		websiteName,
		displayName: (w.DisplayName || w.displayName || websiteName).trim(),
		orgName: (w.OrgName || w.orgName || "").trim() || undefined,
		// Mirrors the Manager app's `instance?.ManagerUrl || <default>` — this is
		// what routes a non-US instance at its own regional host.
		managerUrl: (w.ManagerUrl || w.managerUrl || "").trim() || DEFAULT_MANAGER_URL,
		isDormant: w.IsDormant ?? w.isDormant ?? false,
	};
};

/**
 * The caller's own record for an instance, or null if they have no access.
 *
 * This is the authorization gate for key issuance, and it is why the key route
 * can be trusted: a key is only ever resolved for an instance that came back in
 * THIS visitor's `WebsiteAccess`.
 */
export const getAccessibleInstance = async (guid: string): Promise<ExplorerInstance | null> => {
	if (!guid) return null;
	const session = await getExplorerSession();
	if (!session.signedIn || !session.resolved) return null;
	return session.instances.find((i) => i.guid.toLowerCase() === guid.toLowerCase()) || null;
};
