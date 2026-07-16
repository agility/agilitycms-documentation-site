import { draftMode } from "next/headers";
import { NextRequest } from "next/server";
import { validatePreview, getDynamicPageURL } from "@agility/nextjs/node";

/**
 * Enter preview (draft) mode. Agility's preview deep-links hit this route via
 * proxy.ts with ?agilitypreviewkey=...&slug=...(&ContentID=...).
 */
export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const agilityPreviewKey = searchParams.get("agilitypreviewkey") || "";
	const slug = searchParams.get("slug") || "/";
	const contentIDStr = searchParams.get("ContentID") || "";

	const validationResp = await validatePreview({ agilityPreviewKey, slug });
	if (validationResp.error) {
		return new Response(`${validationResp.message}`, { status: 401 });
	}

	let previewUrl = slug;
	const contentID = parseInt(contentIDStr);
	if (!isNaN(contentID) && contentID > 0) {
		const dynamicPath = await getDynamicPageURL({ contentID, preview: true, slug });
		if (dynamicPath) previewUrl = dynamicPath;
	}

	(await draftMode()).enable();

	// Keep a marker query string — Netlify preserves the incoming QS by default.
	const url = request.nextUrl.clone();
	url.pathname = previewUrl;
	url.search = "?preview=1";
	return Response.redirect(url, 307);
}
