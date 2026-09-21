import "server-only";

import { cookies, headers } from "next/headers";

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

/**
 * LOCAL TESTING ONLY — impersonate a real Agility session from an env var.
 *
 * WHY THIS EXISTS
 * The auth cookie is scoped to `.agilitycms.com`, so a browser will never send
 * it to localhost and none of the signed-in explorer flows can be exercised on
 * a dev machine without help. `AGILITY_DEV_AUTH_COOKIE` supplies the value that
 * a real session would have.
 *
 * ⚠️ WHY THE GUARDS ARE PARANOID
 * This is a credential stored in the environment, and the failure mode if it
 * ever went live is not "a developer sees their own data" — it is that EVERY
 * anonymous visitor is treated as whoever owns that cookie. They would get that
 * person's instance list and, through /api/explorer/fetch-key, that person's
 * API keys. So the override has to be impossible to activate accidentally, and
 * three independent conditions must ALL hold:
 *
 *   1. `AGILITY_DEV_AUTH_COOKIE` is set — it is off unless explicitly opted in.
 *   2. Not on Vercel and not in CI. `VERCEL` is set on every Vercel build and
 *      runtime, production AND preview, so this alone rules out every deployed
 *      environment we have.
 *   3. The request is being served to localhost. This is the one that holds
 *      even if the var somehow reached a deployed environment on some other
 *      host: the override simply never applies to a real visitor's request.
 *
 * `isDevMode()` is deliberately NOT the guard here — it requires
 * NODE_ENV === "development", which is false under `next start`, which is
 * exactly how this gets tested locally (see AGENTS.md, Running Locally).
 *
 * A real cookie always wins, so setting this never shadows an actual session.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

let warnedAboutDevCookie = false;

const devAuthCookieOverride = async (): Promise<string | null> => {
	const value = process.env.AGILITY_DEV_AUTH_COOKIE?.trim();
	if (!value) return null;

	if (process.env.VERCEL || process.env.CI) {
		console.error(
			"[explorer] AGILITY_DEV_AUTH_COOKIE is set in a deployed/CI environment and was " +
				"IGNORED. Remove it — it is a session credential and does not belong here."
		);
		return null;
	}

	const host = (await headers()).get("host") || "";
	const hostname = host.replace(/:\d+$/, "");
	if (!LOCAL_HOSTS.has(hostname)) {
		console.error(
			`[explorer] AGILITY_DEV_AUTH_COOKIE ignored for non-local host "${host}".`
		);
		return null;
	}

	// Once per process, not once per request — the explorer makes several calls
	// per page and a warning on each drowns out everything else in the log.
	if (!warnedAboutDevCookie) {
		warnedAboutDevCookie = true;
		console.warn(
			"[explorer] ⚠️  Using AGILITY_DEV_AUTH_COOKIE — requests are acting as the owner of " +
				"that session. Local only; never set this in a deployed environment."
		);
	}
	return value;
};

/**
 * The auth cookie value, or null when the visitor isn't signed in.
 *
 * Falls back to the local-testing override above ONLY when there is no real
 * cookie and every guard in `devAuthCookieOverride` passes.
 */
export const getAuthCookie = async (): Promise<string | null> => {
	const cookieStore = await cookies();
	const real = cookieStore.get(AUTH_COOKIE)?.value;
	if (real) return real;
	return devAuthCookieOverride();
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
