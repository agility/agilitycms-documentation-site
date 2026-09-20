import { NextRequest } from "next/server";

import { canAccessInstance } from "lib/explorer/agilitySession";
import { managementApiHost } from "lib/api-specs/registry";

/**
 * Issue the PUBLISHED Fetch API key for one of the caller's own instances, so
 * the explorer can run real requests against their content.
 *
 * Two rules, both deliberate:
 *
 * 1. **Membership is checked first.** The upstream endpoint
 *    (`/oauth/getfetchkey`) is unauthenticated — any guid, no token, live key
 *    back (verified 2026-09-20). We will not mirror that. A key is issued only
 *    for an instance the caller can already open in the CMS.
 *
 * 2. **Only the `fetch` key, never `preview`.** They sit on the same upstream
 *    controller with identical signatures, but they are not equivalent: a fetch
 *    key reads PUBLISHED content, while a preview key reads everything,
 *    including unpublished drafts. A published-content key is the right default
 *    for a documentation playground, and there is no query parameter here that
 *    can talk this route into handing out the other one.
 */
export async function GET(request: NextRequest) {
	const guid = (request.nextUrl.searchParams.get("guid") || "").trim();

	if (!guid) {
		return Response.json({ error: "Missing guid." }, { status: 400, headers: NO_STORE });
	}

	if (!(await canAccessInstance(guid))) {
		// Deliberately the same answer for "not signed in", "no access" and
		// "instance doesn't exist" — distinguishing them would let this route be
		// used to probe which GUIDs are real.
		return Response.json(
			{ error: "No access to that instance." },
			{ status: 403, headers: NO_STORE }
		);
	}

	try {
		const res = await fetch(
			`${managementApiHost(guid)}/oauth/getfetchkey?guid=${encodeURIComponent(guid)}`,
			{ cache: "no-store" }
		);
		if (!res.ok) {
			return Response.json(
				{ error: "Could not retrieve the API key for that instance." },
				{ status: 502, headers: NO_STORE }
			);
		}

		// The endpoint answers with the bare key as text/plain (sometimes
		// JSON-quoted), not an envelope.
		const apiKey = (await res.text()).trim().replace(/^"|"$/g, "");
		if (!apiKey) {
			return Response.json(
				{ error: "That instance has no Fetch API key." },
				{ status: 502, headers: NO_STORE }
			);
		}

		return Response.json({ guid, apiKey, apiType: "fetch" }, { headers: NO_STORE });
	} catch {
		return Response.json(
			{ error: "Could not reach the Agility Management API." },
			{ status: 502, headers: NO_STORE }
		);
	}
}

const NO_STORE = {
	"Cache-Control": "private, no-store",
	"Netlify-CDN-Cache-Control": "no-store",
};
