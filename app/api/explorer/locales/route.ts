import { NextRequest } from "next/server";

import { getAccessibleInstance, getAuthCookie } from "lib/explorer/agilitySession";
import { getMgmtAccessToken, mgmtGet } from "lib/explorer/mgmtApi";

/**
 * The locales enabled on one of the caller's instances, so the explorer's
 * `locale` parameter can be a real dropdown instead of a free-text box the
 * reader has to guess into.
 *
 * Guessing is the actual problem here: an Agility instance's locales are
 * whatever its owner configured, `en-us` is only the common default, and a
 * wrong locale returns an empty result rather than an error — so a reader
 * trying the API against their own content would see "no items" and reasonably
 * conclude the API was broken.
 *
 * Same authorization gate as the key route: resolved only for an instance in
 * this visitor's own WebsiteAccess. The Management API bearer token used here
 * is minted server-side from their cookie and never leaves the server.
 */
export async function GET(request: NextRequest) {
	const guid = (request.nextUrl.searchParams.get("guid") || "").trim();
	if (!guid) {
		return Response.json({ error: "Missing guid." }, { status: 400, headers: NO_STORE });
	}

	const cookieValue = await getAuthCookie();
	const instance = cookieValue ? await getAccessibleInstance(guid) : null;
	if (!cookieValue || !instance) {
		return Response.json(
			{ error: "No access to that instance." },
			{ status: 403, headers: NO_STORE }
		);
	}

	try {
		const token = await getMgmtAccessToken(instance.managerUrl, cookieValue);
		if (!token) {
			return Response.json({ locales: [] }, { headers: NO_STORE });
		}

		const raw = await mgmtGet<RawLocale[]>(
			instance.managerUrl,
			`/instance/${encodeURIComponent(guid)}/locales`,
			token
		);

		// An empty list is returned rather than an error: the locale field falls
		// back to free text, which still works. A hard failure here would block
		// a request the reader could otherwise make.
		const locales = (Array.isArray(raw) ? raw : [])
			.filter((l) => l?.localeCode && l.enabled !== false)
			.map((l) => ({ code: l.localeCode, name: l.localeName || l.localeCode }));

		return Response.json({ locales }, { headers: NO_STORE });
	} catch {
		return Response.json({ locales: [] }, { headers: NO_STORE });
	}
}

interface RawLocale {
	localeID?: number;
	localeCode?: string;
	localeName?: string;
	enabled?: boolean;
}

const NO_STORE = {
	"Cache-Control": "private, no-store",
	"Netlify-CDN-Cache-Control": "no-store",
};
