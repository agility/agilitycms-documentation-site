/*
  Deprecation / archive registry for framework & SDK docs (content refresh plan
  Phase 0, docs/content-refresh-plan-2026.md §4).

  ONE place decides whether a framework's docs are archived or hidden. Adding an
  entry here simultaneously:
    - renders the "Legacy" banner on every article under that path
      (components/common/LegacyNotice.tsx, rendered by DynamicArticleDetails),
    - marks those pages `noindex` (lib/cms-content/resolveAgilityMetaData.ts),
    - hides the framework from the APIs & SDKs nav on desktop AND mobile
      (components/common/Header.tsx).

  URLs stay live either way — external deep links must not 404. Archiving is a
  signal, not a delete.

  Why code and not per-article CMS edits: the banner text stays consistent, it
  applies to new articles in the same section automatically, it needs no publish
  step per article, and un-archiving is a one-line revert. The CMS remains the
  source of truth for the article *content*; this file only records lifecycle.
*/

export type LegacyStatus =
	/** Superseded / unmaintained. Banner + noindex + hidden from nav. */
	| "archived"
	/** Not ready for prime time (content unwritten). Hidden from nav only. */
	| "hidden";

export interface LegacyEntry {
	/** Path prefix under /docs, no basePath and no trailing slash (e.g. "/gatsby"). */
	path: string;
	name: string;
	status: LegacyStatus;
	/** Shown in the banner body. Required for `archived`. */
	reason?: string;
	/** Optional "go here instead" pointer rendered in the banner. */
	successor?: { text: string; href: string };
}

export const LEGACY_ENTRIES: LegacyEntry[] = [
	{
		path: "/gatsby",
		name: "Gatsby",
		status: "archived",
		reason:
			"These guides date from 2021 and reference Gatsby Cloud, a service that has since shut down.",
		successor: { text: "See the current framework guides", href: "/developers" },
	},
	{
		// All 10 SvelteKit articles are unpublished, and 8 of them are empty or a
		// stub — the nav entry pointed at a section with no live content. Restore
		// to the nav once Phase 2 lands (finish + publish the articles).
		path: "/sveltekit",
		name: "SvelteKit",
		status: "hidden",
	},
];

// Lower-cased + de-trailing-slashed. Case folding is deliberate: docs section
// paths are NOT all lowercase (the .NET section is `/dotNet`), and a
// case-sensitive prefix match would silently fail to archive such a section —
// no banner, no noindex, still in the nav, with nothing to indicate it broke.
const normalize = (p: string) => (p || "").toLowerCase().replace(/\/+$/, "") || "/";

/** Match a path (e.g. "/gatsby/using-the-gatsby-blog-starter") to its entry. */
const matchEntry = (path: string): LegacyEntry | undefined => {
	const p = normalize(path);
	return LEGACY_ENTRIES.find((e) => {
		const ep = normalize(e.path);
		return p === ep || p.startsWith(`${ep}/`);
	});
};

/** The archived entry for a path, if it should show the Legacy banner. */
export const getArchivedEntry = (path: string): LegacyEntry | undefined => {
	const entry = matchEntry(path);
	return entry?.status === "archived" ? entry : undefined;
};

/** Archived docs must not be indexed — they describe unmaintained tooling. */
export const isNoIndexPath = (path: string): boolean => !!getArchivedEntry(path);

/**
 * Should this nav href be hidden from the APIs & SDKs menu? Applies to both
 * `archived` and `hidden` entries. Absolute/external hrefs never match.
 */
export const isNavHidden = (href: string): boolean => {
	if (!href || /^https?:\/\//i.test(href)) return false;
	// Nav hrefs from the CMS may carry the /docs basePath; the registry doesn't.
	// Strip case-insensitively — CMS hrefs use the "~/" site-root form too.
	const path = href.replace(/^~/, "").replace(/^\/docs(?=\/|$)/i, "");
	return !!matchEntry(path);
};
