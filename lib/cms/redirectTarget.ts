/** A sitemap node's `redirect`. The Fetch API sends a link page as `{ url, target }`. */
export type SitemapRedirect = string | { url: string; target?: string | null } | null;

/**
 * The URL a link page points at, or null. Agility writes in-site links as
 * `~/path`; `~` is the site root, which basePath (/docs) already covers.
 * Kept free of server-only imports: proxy.ts uses it too.
 */
export const redirectTarget = (redirect: SitemapRedirect | undefined): string | null => {
	const url = typeof redirect === "string" ? redirect : redirect?.url;
	if (!url) return null;
	return url.startsWith("~/") ? url.slice(1) : url;
};
