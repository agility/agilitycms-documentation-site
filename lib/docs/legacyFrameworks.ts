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
	/** Unmaintained tooling. Banner + noindex + hidden from nav. */
	| "archived"
	/**
	 * Content that moved — a duplicate left in place after a consolidation. The
	 * docs are still accurate, they're just no longer the canonical copy, so the
	 * banner points at the successor instead of calling them unmaintained. Also
	 * `noindex`, which is the point: it stops the duplicate competing with the
	 * canonical article in search.
	 */
	| "superseded"
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

/** Canonical home of the consolidated, language-tabbed Management SDK docs. */
const MANAGEMENT_SDK_BASE = "/javascript/management-sdk";

/**
 * Build `superseded` entries for the old Management SDK duplicates. Each tuple is
 * [old article path, canonical slug under MANAGEMENT_SDK_BASE].
 */
const supersededByManagementSDK = (pairs: [string, string][]): LegacyEntry[] =>
	pairs.map(([path, slug]) => ({
		path,
		name: "the Management SDK",
		status: "superseded" as const,
		reason:
			"The JavaScript and .NET guides have been merged into a single set with per-language code tabs.",
		successor: {
			text: "Read the current guide",
			href: `${MANAGEMENT_SDK_BASE}/${slug}`,
		},
	}));

export const LEGACY_ENTRIES: LegacyEntry[] = [
	{
		path: "/gatsby",
		name: "Gatsby",
		status: "archived",
		reason:
			"These guides date from 2021 and reference Gatsby Cloud, a service that has since shut down.",
		successor: { text: "See the current framework guides", href: "/developers" },
	},
	// SvelteKit was `hidden` here while its articles were unwritten; Phase 2
	// landed 2026-07-29 (all 10 articles authored + published), so it's back in
	// the nav. See docs/content-refresh-plan-2026.md §5 Phase 2.

	/*
	  Management SDK consolidation (Phase 3, 2026-07-30). The SDK used to be
	  documented twice — once under /javascript and once under /dotNet — and both
	  copies are still published. They're now superseded by one language-tabbed
	  set at /javascript/management-sdk/*, so each old path gets a "this moved"
	  banner and `noindex` (so the duplicate stops competing with the canonical
	  article in search) while the URL itself keeps working for bookmarks and
	  external links. These are exact article paths, not section prefixes — the
	  matcher only matches a whole path or a `path/` prefix, and the duplicates
	  are individual articles inside otherwise-current sections.
	*/
	...supersededByManagementSDK([
		// JavaScript copies
		["/javascript/content-management-js-sdk", "getting-started"],
		["/javascript/management-sdk-content", "content-items"],
		["/javascript/management-sdk-models", "models"],
		["/javascript/management-sdk-containers", "containers"],
		["/javascript/management-sdk-pages", "pages"],
		["/javascript/management-sdk-assets", "assets"],
		["/javascript/management-sdk-instance-operations", "instance"],
		// .NET copies
		["/dotNet/management-sdk-dotnet-intro", "getting-started"],
		["/dotNet/management-sdk-dotnet-content", "content-items"],
		["/dotNet/management-sdk-dotnet-models", "models"],
		["/dotNet/management-sdk-dotnet-containers", "containers"],
		["/dotNet/management-sdk-dotnet-pages", "pages"],
		["/dotNet/management-sdk-dotnet-assets", "assets"],
		["/dotNet/management-sdk-dotnet-instance-users", "instance"],
	]),
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

/**
 * The entry for a path if it should show a notice banner — either `archived`
 * (unmaintained) or `superseded` (moved). The banner varies its wording by
 * `status`; see components/common/LegacyNotice.tsx.
 */
export const getNoticeEntry = (path: string): LegacyEntry | undefined => {
	const entry = matchEntry(path);
	return entry?.status === "archived" || entry?.status === "superseded" ? entry : undefined;
};

/** @deprecated use getNoticeEntry — kept so existing callers keep compiling. */
export const getArchivedEntry = getNoticeEntry;

/**
 * Neither archived nor superseded docs should be indexed: the first describes
 * unmaintained tooling, the second would compete with its own canonical copy.
 */
export const isNoIndexPath = (path: string): boolean => !!getNoticeEntry(path);

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
