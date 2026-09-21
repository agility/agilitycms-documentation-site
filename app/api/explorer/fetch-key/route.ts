import { NextRequest } from "next/server";

import { getAccessibleInstance, getAuthCookie } from "lib/explorer/agilitySession";
import { ClassicAuthError, classicCall } from "lib/explorer/classicCall";

/**
 * Resolve the Fetch API key for one of the caller's own instances, so the
 * explorer can run real requests against their content.
 *
 * SAME METHODOLOGY AS THE MANAGER APP
 * -----------------------------------
 * This mirrors agility-cms-manager-app-react exactly — `useAllAPIKeys` +
 * `useAPISecret`, both over `authenticatedCall`:
 *
 *   1. POST /json/Settings/SelectAllAPIKeys { websiteName, take, token }
 *        -> { Items: [{ Name, Type: "fetch" | "preview", Enabled, ... }] }
 *   2. POST /json/Settings/GetAPISecret    { websiteName, type, name }
 *        -> the secret
 *   3. The usable key is `Name.secret` (see APIKeyCopier.tsx).
 *
 * An earlier version of this route called `GET mgmt.aglty.io/oauth/getfetchkey`
 * instead. That endpoint works, but it is **unauthenticated** — any guid, no
 * token, live key back (verified 2026-09-20) — so it could say nothing about
 * whether the caller was entitled to the key, and the entitlement check had to
 * be bolted on beside it. The Classic route is authenticated by the visitor's
 * own session and keyed by `websiteName`, so authorization is intrinsic: the
 * call simply fails for an instance they can't reach. Better primitive.
 *
 * Two limits remain deliberate:
 *
 * - **Membership is still checked first**, against this visitor's own
 *   `WebsiteAccess`. Defence in depth, and it means we never make a Classic
 *   call on behalf of a guid the caller has nothing to do with.
 * - **Only `Type === "fetch"`, never `preview`.** They sit side by side in the
 *   same `Items` array, and they are not equivalent: a fetch key reads
 *   PUBLISHED content, a preview key reads everything including unpublished
 *   drafts. Published content is the right default for a documentation
 *   playground, and there is no parameter here that can talk this route into
 *   returning the other one.
 */
export async function GET(request: NextRequest) {
	const guid = (request.nextUrl.searchParams.get("guid") || "").trim();

	if (!guid) {
		return Response.json({ error: "Missing guid." }, { status: 400, headers: NO_STORE });
	}

	const cookieValue = await getAuthCookie();
	const instance = cookieValue ? await getAccessibleInstance(guid) : null;

	if (!cookieValue || !instance) {
		// Deliberately the same answer for "not signed in", "no access" and
		// "instance doesn't exist" — distinguishing them would let this route be
		// used to probe which GUIDs are real.
		return Response.json(
			{ error: "No access to that instance." },
			{ status: 403, headers: NO_STORE }
		);
	}

	const { websiteName, managerUrl } = instance;

	try {
		const keyList = await classicCall<{ Items?: ClassicApiKey[] }>({
			managerUrl,
			path: "/json/Settings/SelectAllAPIKeys",
			// `take: 100` and `token: null` match the Manager app's call.
			body: { websiteName, take: 100, token: null },
			cookieValue,
		});

		const key = pickFetchKey(keyList?.Items || []);
		if (!key) {
			return Response.json(
				{ error: "That instance has no enabled Fetch API key." },
				{ status: 404, headers: NO_STORE }
			);
		}

		const secret = await classicCall<string>({
			managerUrl,
			path: "/json/Settings/GetAPISecret",
			body: { websiteName, type: key.Type, name: key.Name },
			cookieValue,
		});

		if (!secret) {
			return Response.json(
				{ error: "Could not resolve the API key secret." },
				{ status: 502, headers: NO_STORE }
			);
		}

		// The usable key is `Name.secret` — see APIKeyCopier.tsx in the Manager app.
		return Response.json(
			{ guid, apiKey: `${key.Name}.${secret}`, apiType: "fetch", keyName: key.Name },
			{ headers: NO_STORE }
		);
	} catch (err) {
		if (err instanceof ClassicAuthError) {
			return Response.json(
				{ error: "Your Agility session has expired. Sign in again." },
				{ status: 401, headers: NO_STORE }
			);
		}
		return Response.json(
			{ error: "Could not reach Agility to resolve the API key." },
			{ status: 502, headers: NO_STORE }
		);
	}
}

interface ClassicApiKey {
	Name: string;
	/** "fetch" or "preview". */
	Type: string;
	Enabled: boolean;
	ExpiryDate: string | null;
	Suspended?: boolean;
}

/**
 * The first usable published-content key.
 *
 * An instance can carry several, including disabled, suspended and expired
 * ones — handing back any of those produces a 401 from the Fetch API that
 * looks like a bug in the explorer rather than a key that was never going to
 * work. `Type` is compared case-insensitively because Classic stores it as
 * free text.
 */
const pickFetchKey = (items: ClassicApiKey[]): ClassicApiKey | null => {
	const now = Date.now();
	return (
		items.find(
			(k) =>
				k?.Name &&
				(k.Type || "").toLowerCase() === "fetch" &&
				k.Enabled &&
				!k.Suspended &&
				(!k.ExpiryDate || new Date(k.ExpiryDate).getTime() > now)
		) || null
	);
};

const NO_STORE = {
	"Cache-Control": "private, no-store",
	"Netlify-CDN-Cache-Control": "no-store",
};
