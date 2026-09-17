import { draftMode } from "next/headers";
import { NextRequest } from "next/server";
import nextConfig from "next.config";

/** Exit preview (draft) mode and bounce back to the page. */
export async function GET(request: NextRequest) {
	(await draftMode()).disable();

	const slug = request.nextUrl.searchParams.get("slug") || "/";
	// request.nextUrl in a route handler does not re-add the basePath when
	// serialized (middleware does) — prepend it or we redirect outside /docs.
	const url = request.nextUrl.clone();
	url.pathname = `${nextConfig.basePath || ""}${slug}`;
	url.search = "";
	return Response.redirect(url, 307);
}
