import { draftMode } from "next/headers";
import { NextRequest } from "next/server";
import { getDynamicPageURL } from "@agility/nextjs/node";
import nextConfig from "next.config";

/**
 * Resolve a ?ContentID=n deep link (from the Agility UI) to the dynamic
 * page's real URL. proxy.ts rewrites those requests here.
 */
export async function GET(request: NextRequest) {
	const contentIDStr = request.nextUrl.searchParams.get("ContentID") || "";
	const contentID = parseInt(contentIDStr);

	if (isNaN(contentID) || contentID <= 0) {
		return new Response("Invalid ContentID", { status: 400 });
	}

	const { isEnabled: preview } = await draftMode();
	const redirectUrl = await getDynamicPageURL({ contentID, preview, slug: "" });

	if (!redirectUrl) {
		return new Response("No dynamic page found for that ContentID", { status: 404 });
	}

	// request.nextUrl in a route handler does not re-add the basePath when
	// serialized (middleware does) — prepend it or we redirect outside /docs.
	const url = request.nextUrl.clone();
	url.pathname = `${nextConfig.basePath || ""}${redirectUrl}`;
	url.search = "";
	return Response.redirect(url, 307);
}
