/**
 * robots.txt for docs.agilitycms.com ONLY.
 *
 * That host points straight at this Vercel app (no Netlify proxy), so every
 * docs page is reachable on it as a duplicate of agilitycms.com/docs. The pages
 * already canonicalize to agilitycms.com/docs, but the host's root /robots.txt
 * used to 404 (the app lives under basePath /docs), so crawling wasn't blocked.
 *
 * Reached through the host-gated `basePath: false` redirect in
 * next.config.js. It never decides anything for agilitycms.com: the apex's
 * /robots.txt belongs to the marketing site, which only proxies /docs/* here.
 *
 * The Knowledgebase MCP is published at docs.agilitycms.com/docs/api/mcp.
 * MCP clients don't read robots.txt, so this doesn't affect it.
 */
export function GET() {
	return new Response("User-agent: *\nDisallow: /\n", {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
