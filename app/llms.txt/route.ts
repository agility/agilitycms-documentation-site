import { getSitemapFlat, SitemapNode } from "lib/cms/getSitemapFlat";
import { defaultLocale } from "lib/i18n/config";

/**
 * llms.txt (rebuild plan T7) — a machine-readable index of the docs for AI
 * agents, served at /docs/llms.txt (basePath applies). Built from the cached
 * flat sitemap, so it revalidates with the same webhook as the pages.
 *
 * Format follows the llms.txt convention (llmstxt.org): H1, blockquote
 * summary, H2 sections of "- [title](url): purpose" links.
 */

const BASE = "https://agilitycms.com/docs";

// Curated one-line purposes for the pages that anchor the docs. Anything not
// listed falls back to its sitemap title alone.
const PAGE_PURPOSES: { [path: string]: string } = {
	"/web-studio": "Visual page builder — edit pages in context with live preview, comments, and co-authoring",
	"/page-management": "Page orchestration in the headless CMS — sitemaps, routing, and component-driven pages editors control",
	"/ai": "AI agents and the OAuth-secured MCP server — author, model, and manage content with Claude, ChatGPT, Cursor, and any MCP client",
	"/overview": "Core concepts of Agility CMS — content, pages, sitemaps, and how they fit together",
	"/editors": "Docs for content editors — authoring, publishing, workflows, and Web Studio",
	"/developers": "Docs for developers — APIs, SDKs, page management, and integrations",
	"/owners-admins": "Docs for owners and admins — users, roles, security, and billing",
	"/training-guide": "Guided training path for new Agility teams",
	"/apps": "Marketplace apps and custom app development",
	"/changelog": "Platform release notes",
};

const FLAGSHIP_PATHS = ["/web-studio", "/page-management", "/ai"];
// /home is the docs root — the H1/blockquote already describe it.
const EXCLUDED_PATHS = new Set(["/home", "/404", "/500", "/codefeature", "/ocean-test"]);

export async function GET() {
	const sitemap = await getSitemapFlat({ locale: defaultLocale, preview: false });

	const paths = Object.keys(sitemap).filter((path) => {
		const node = sitemap[path];
		if (node.redirect || node.isFolder) return false;
		if (node.visible && node.visible.sitemap === false) return false;
		if (EXCLUDED_PATHS.has(path)) return false;
		return true;
	});

	const line = (path: string, node: SitemapNode, withMd: boolean) => {
		const purpose = PAGE_PURPOSES[path];
		const url = withMd ? `${BASE}${path}.md` : `${BASE}${path}`;
		return `- [${node.title || node.menuText}](${url})${purpose ? `: ${purpose}` : ""}`;
	};

	const out: string[] = [
		"# Agility CMS Documentation",
		"",
		"> Documentation for Agility CMS — the headless CMS built for editors, developers, and AI agents. Covers visual editing in Web Studio, page management and orchestration, content APIs and SDKs, and AI agent integration via the MCP server.",
		"",
		"Every article is also available as clean markdown: append `.md` to its URL.",
		"",
	];

	// Flagship capabilities first.
	const flagships = FLAGSHIP_PATHS.filter((p) => sitemap[p]);
	if (flagships.length > 0) {
		out.push("## Flagship capabilities", "");
		flagships.forEach((p) => out.push(line(p, sitemap[p], false)));
		out.push("");
	}

	// Section landing pages: depth-1 static pages (no article contentID).
	const sectionPaths = paths.filter(
		(p) => p.split("/").length === 2 && !FLAGSHIP_PATHS.includes(p) && !(sitemap[p].contentID && sitemap[p].contentID > 0)
	);
	out.push("## Sections", "");
	sectionPaths.forEach((p) => out.push(line(p, sitemap[p], false)));
	out.push("");

	// Articles grouped by top-level section, as .md links.
	const articlePaths = paths.filter((p) => p.split("/").length > 2);
	const bySection = new Map<string, string[]>();
	for (const p of articlePaths) {
		const top = `/${p.split("/")[1]}`;
		if (!bySection.has(top)) bySection.set(top, []);
		bySection.get(top)!.push(p);
	}

	for (const [sectionPath, children] of Array.from(bySection.entries())) {
		const sectionNode = sitemap[sectionPath];
		const sectionTitle = sectionNode?.title || sectionNode?.menuText || sectionPath.slice(1);
		out.push(`## ${sectionTitle} articles`, "");
		children.forEach((p) => out.push(line(p, sitemap[p], true)));
		out.push("");
	}

	return new Response(out.join("\n"), {
		status: 200,
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cdn-cache-control": "public, s-maxage=60, stale-while-revalidate=86400",
		},
	});
}
