import { MetadataRoute } from "next";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";
import { getSitemapLastModifiedMap } from "lib/cms/getSitemapLastModifiedMap";
import { locales, localizeUrl } from "lib/i18n/config";

// Canonical base, matching the rest of the docs site (getRichSnippet /
// resolveAgilityMetaData). basePath /docs is baked in because MetadataRoute
// sitemap URLs must be absolute — Next does NOT prepend basePath to them.
const SITE_URL = "https://agilitycms.com/docs";

/**
 * sitemap.xml — Next metadata convention, served at /docs/sitemap.xml.
 * Ported from the marketing site (app/sitemap.tsx): emit only <loc> + <lastmod>
 * with an ACCURATE per-URL lastmod pulled from the backing content/page
 * modified dates (getSitemapLastModifiedMap). No <changefreq>/<priority> —
 * Google ignores them and blanket values only contradict the real lastmod; when
 * no reliable date exists, the URL is emitted with no <lastmod> at all.
 *
 * Skips folders, redirects and hidden pages; the first node of each locale maps
 * to the locale root. Statically prerendered and revalidated through the
 * Agility content/page cache tags the underlying reads consume (busted by
 * /api/revalidate on publish) — the Cache Components equivalent of the
 * marketing site's ISR `revalidate`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const entries: MetadataRoute.Sitemap = [];

	for (const locale of locales) {
		const [flat, lastModMap] = await Promise.all([
			getSitemapFlat({ locale, preview: false }),
			getSitemapLastModifiedMap({ locale }),
		]);

		const visiblePaths = Object.keys(flat).filter((path) => {
			const node = flat[path];
			return node && !node.isFolder && !node.redirect && node.visible?.sitemap !== false;
		});

		visiblePaths.forEach((path, index) => {
			// The first sitemap node is the home page, served at the locale root.
			const relative = index === 0 ? localizeUrl("/", locale) : localizeUrl(path, locale);
			const url = `${SITE_URL}${relative}`;
			const lastModified = lastModMap[path];
			entries.push(lastModified ? { url, lastModified: new Date(lastModified) } : { url });
		});
	}

	return entries;
}
