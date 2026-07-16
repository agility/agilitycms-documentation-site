import { draftMode } from "next/headers";
import { NextRequest } from "next/server";

/** Exit preview (draft) mode and bounce back to the page. */
export async function GET(request: NextRequest) {
	(await draftMode()).disable();

	const slug = request.nextUrl.searchParams.get("slug") || "/";
	const url = request.nextUrl.clone();
	url.pathname = slug;
	url.search = "?preview=0";
	return Response.redirect(url, 307);
}
