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
	/**
	 * Still useful but behind the framework's current release, and kept on
	 * purpose. Banner only: the docs stay indexed and in the nav, so readers who
	 * search for the framework still find them, along with a pointer to the
	 * recommended alternative and a way to tell us they need it.
	 */
	| "outdated"
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
	/** Optional "tell us you need this" link rendered after the successor. */
	feedback?: { text: string; href: string };
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
	{
		// A single article, outside /gatsby, documenting the same dead service.
		path: "/developers/gatsby-cloud",
		name: "Gatsby Cloud",
		status: "archived",
		reason: "Gatsby Cloud shut down in 2023, so the steps on this page no longer work.",
		successor: { text: "See the deployment guides", href: "/developers/website-deployment-checklist" },
	},
	/*
	  Next.js guides retired 2026-10-03 (recorded as "retire" in
	  docs/content-refresh-plan-2026.md Phase 4 on 2026-07-29). Both AWS guides
	  are Pages Router era and pin end-of-life Node versions; Next.js Commerce,
	  which the commerce starter is built on, is no longer maintained by Vercel.
	*/
	...[
		["/nextjs/deploying-next-js-to-aws-ec2", "AWS EC2"],
		["/nextjs/deploying-next-js-to-aws-amplify", "AWS Amplify"],
	].map(([path, host]) => ({
		path,
		name: `the ${host} guide`,
		status: "archived" as const,
		reason: `This ${host} guide predates the Next.js App Router and pins a Node.js version that is no longer supported.`,
		successor: { text: "See the current Next.js guides", href: "/nextjs" },
	})),
	...["/nextjs/using-the-next-js-commerce-starter", "/nextjs/how-the-next-js-commerce-starter-works"].map(
		(path) => ({
			path,
			name: "the Next.js Commerce starter",
			status: "archived" as const,
			reason: "This starter is built on Next.js Commerce, which is no longer maintained.",
			successor: { text: "See the headless commerce guide", href: "/overview/build-a-headless-ecommerce-website" },
		})
	),
	/*
	  Framework starters archived 2026-10-03 (docs/docs-modernization-plan-2026.md
	  §9 decision 9): each starter is one or more major versions behind and the
	  sections drew single-digit page views from 2026-09-14 to 2026-10-03, against
	  88 for Next.js. Joel's rule: archive outdated starters unless traffic says
	  otherwise. Un-archive by deleting the entry once a starter is upgraded.
	  SvelteKit's articles were rewritten 2026-07-29, but its starter is still on
	  Kit 2 and SvelteKit 3 shipped 2026-10-01.
	  Successors point at article 1736 (published 2026-10-05), which explains the
	  recommendation and invites requests for other frameworks.
	*/
	...[
		["/angular", "Angular", "The Angular starter targets Angular 18, which is out of support."],
		["/astro", "Astro", "The Astro starter targets Astro 4; the current release is Astro 7."],
		["/eleventy", "Eleventy", "The Eleventy starter dates from 2021 and targets Eleventy 0.11."],
		[
			"/sveltekit",
			"SvelteKit",
			"The SvelteKit starter targets SvelteKit 2; SvelteKit 3 shipped in October 2026.",
		],
	].map(([path, name, reason]) => ({
		path,
		name,
		status: "archived" as const,
		reason,
		successor: { text: "See why we recommend Next.js and .NET", href: "/developers/why-we-recommend-nextjs-and-dotnet" },
		feedback: {
			text: `If you need ${name}, let us know`,
			href: `mailto:support@agilitycms.com?subject=${encodeURIComponent(`${name} support in Agility CMS`)}`,
		},
	})),
	{
		// Kept on purpose (Joel, 2026-10-03): the docs stay up and indexed, with a
		// clear "this is behind" note and a way to ask for an update.
		path: "/nuxt",
		name: "Nuxt",
		status: "outdated",
		reason:
			"These guides and the starter they describe cover Nuxt 2; the current release is Nuxt 4. For new projects we recommend Next.js.",
		successor: { text: "See why we recommend Next.js and .NET", href: "/developers/why-we-recommend-nextjs-and-dotnet" },
		feedback: {
			text: "If you need Nuxt, let us know",
			href: "mailto:support@agilitycms.com?subject=Nuxt%20support%20in%20Agility%20CMS",
		},
	},

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
 * The entry for a path if it should show a notice banner: `archived`
 * (unmaintained), `superseded` (moved) or `outdated` (behind, kept on purpose).
 * The banner varies its wording by `status`; see components/common/LegacyNotice.tsx.
 */
export const getNoticeEntry = (path: string): LegacyEntry | undefined => {
	const entry = matchEntry(path);
	return entry && entry.status !== "hidden" ? entry : undefined;
};

/** @deprecated use getNoticeEntry — kept so existing callers keep compiling. */
export const getArchivedEntry = getNoticeEntry;

/**
 * Neither archived nor superseded docs should be indexed: the first describes
 * unmaintained tooling, the second would compete with its own canonical copy.
 */
export const isNoIndexPath = (path: string): boolean => {
	const status = matchEntry(path)?.status;
	return status === "archived" || status === "superseded";
};

/**
 * Should this nav href be hidden from the APIs & SDKs menu? Applies to every
 * status except `outdated`, which stays listed on purpose. Absolute/external
 * hrefs never match.
 */
export const isNavHidden = (href: string): boolean => {
	if (!href || /^https?:\/\//i.test(href)) return false;
	// Nav hrefs from the CMS may carry the /docs basePath; the registry doesn't.
	// Strip case-insensitively — CMS hrefs use the "~/" site-root form too.
	const path = href.replace(/^~/, "").replace(/^\/docs(?=\/|$)/i, "");
	const status = matchEntry(path)?.status;
	return !!status && status !== "outdated";
};
