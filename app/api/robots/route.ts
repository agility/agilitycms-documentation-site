import { NextRequest } from "next/server";

/**
 * robots.txt (rewritten from /robots.txt in next.config.js). Only allows
 * crawling when fronted by the Netlify proxy on agilitycms.com — direct
 * *.vercel.app access is disallowed so the canonical domain wins.
 */
export async function GET(req: NextRequest) {
	const cdnLoop = req.headers.get("cdn-loop") || "";
	const host = req.headers.get("host") || "";

	if (cdnLoop && cdnLoop.indexOf("netlify") !== -1) {
		return new Response(
			"sitemap: https://agilitycms.com/docs/sitemap.xml\n\n User-agent: *\nAllow: /",
			{
				status: 200,
				headers: {
					"Content-Type": "text/plain",
					Vary: "cdn-loop",
					"Cache-Control": "no-store",
				},
			}
		);
	}

	return new Response("User-agent: *\nDisallow: /", {
		status: 200,
		headers: {
			"Content-Type": "text/plain",
			Vary: "cdn-loop",
			"X-CDN-Loop": cdnLoop,
			"X-Host": host,
			"Cache-Control": "no-store",
		},
	});
}
