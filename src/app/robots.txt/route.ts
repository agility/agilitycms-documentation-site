import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
	const cdnLoop = request.headers.get("cdn-loop") || ""
	const host = request.headers.get("host") || ""

	if (cdnLoop && cdnLoop.indexOf("netlify") !== -1) {
		//only allow crawling on agility domains
		return new NextResponse(
			"sitemap: https://agilitycms.com/docs/sitemap.xml\n\n User-agent: *\nAllow: /",
			{
				headers: {
					"Content-Type": "text/plain",
					"Vary": "cdn-loop",
					"Cache-Control": "no-store",
				},
			}
		)
	} else {
		//disallow any crawling on non-agility domains
		return new NextResponse(
			"User-agent: *\nDisallow: /",
			{
				headers: {
					"Vary": "cdn-loop",
					"X-CDN-Loop": cdnLoop,
					"X-Host": host,
					"Content-Type": "text/plain",
					"Cache-Control": "no-store",
				},
			}
		)
	}
}
