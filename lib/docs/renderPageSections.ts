/**
 * On-this-page headings for MODULE pages (the hub pages built on Main Template
 * — /docs/ai, /docs/web-studio, /docs/page-management), the counterpart to
 * `renderArticleBody` for dynamic article pages.
 *
 * An article has one body field, so its nav falls out of the markdown pipeline.
 * A hub page's prose is spread across several ProseSection modules whose bodies
 * are CMS rich text with no ids on the headings, so there is nothing to anchor
 * to until we put something there. This walks the zone in render order, assigns
 * an id to every H2 and hands back both the rewritten bodies and the flat
 * heading list.
 *
 * Wrapped in React `cache()` on the `page` object so the template (which needs
 * the headings) and each module (which needs its own rewritten body) share one
 * computation per request — the same trick renderArticleBody uses. ContentZone
 * passes every module the same `page` reference, which is what makes the cache
 * hit. Pure string work: no fetches, no clocks, nothing that would make a
 * Cache Components route postpone.
 */
import { cache } from "react";
import { parse } from "node-html-parser";
import { renderHTML } from "utils/htmlUtils";
import type { ArticleHeading } from "./renderArticleBody";

export interface RenderedPageSections {
	/** H2s across the whole zone, in render order, for the on-this-page nav. */
	headings: ArticleHeading[];
	/** ProseSection contentID → its body HTML, with ids added to the headings. */
	bodyByContentID: Map<number, string>;
	/** Module contentID → the id given to the heading that module renders itself. */
	headingIdByContentID: Map<number, string>;
}

const EMPTY: RenderedPageSections = {
	headings: [],
	bodyByContentID: new Map(),
	headingIdByContentID: new Map(),
};

/**
 * Slugs the way github-slugger (via rehype-slug) does on the article side, so an
 * anchor on a hub page looks like an anchor on an article: lowercased, punctuation
 * dropped rather than replaced, whitespace collapsed to single dashes.
 * "Write an AGENTS.md" → `write-an-agentsmd`.
 */
const slugify = (text: string): string =>
	text
		.trim()
		.toLowerCase()
		// Strip punctuation rather than whitelisting word characters, so accented
		// letters survive. (Unicode property escapes would need the /u flag, which
		// this tsconfig's target rejects.)
		.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "")
		.replace(/\s+/g, "-");

/** Dedupe within the page the way github-slugger does: `slug`, `slug-1`, `slug-2`. */
const uniqueId = (base: string, seen: Map<string, number>): string => {
	const count = seen.get(base) ?? 0;
	seen.set(base, count + 1);
	return count === 0 ? base : `${base}-${count}`;
};

/**
 * ContentZone resolves a module's name as `module` with a fallback to the item's
 * definitionName, so the zone can carry either shape. Match that exactly — a
 * mismatch here would silently drop a section from the nav.
 */
const moduleNameOf = (entry: any): string =>
	entry?.module ?? entry?.item?.properties?.definitionName ?? "";

export const renderPageSections = cache((page: any): RenderedPageSections => {
	const modules: any[] = page?.zones?.MainContentZone || [];
	if (modules.length === 0) return EMPTY;

	const headings: ArticleHeading[] = [];
	const bodyByContentID = new Map<number, string>();
	const headingIdByContentID = new Map<number, string>();
	const seen = new Map<string, number>();

	for (const entry of modules) {
		const item = entry?.item;
		const contentID = Number(item?.contentID ?? item?.contentid);
		const fields = item?.fields || {};
		if (!contentID) continue;

		switch (moduleNameOf(entry)) {
			case "ProseSection": {
				// renderHTML first: it is what ProseSection renders today (it rewrites
				// `~/` hrefs and sets targets), so ids land on the same markup the
				// browser gets rather than on a pre-cleaned copy of it.
				const cleaned = renderHTML(fields.body).__html;
				if (!cleaned) break;

				const root = parse(cleaned);
				const h2s = root.querySelectorAll("h2");
				if (h2s.length === 0) break;

				for (const h2 of h2s) {
					const name = h2.structuredText.trim() || h2.text.trim();
					if (!name) continue;
					// An id already in the rich text is the author's; keep it and only
					// register it, so a hand-made anchor elsewhere keeps working.
					const existing = h2.getAttribute("id");
					const id = existing || uniqueId(slugify(name), seen);
					if (!existing) h2.setAttribute("id", id);
					headings.push({ id, name });
				}

				bodyByContentID.set(contentID, root.toString());
				break;
			}

			case "ArticleListSection": {
				// This module renders its own <h2> from a plain text field, so there is
				// no HTML to rewrite — it just needs to be told which id to use.
				const name = String(fields.sectionHeading || "").trim();
				if (!name) break;
				const id = uniqueId(slugify(name), seen);
				headingIdByContentID.set(contentID, id);
				headings.push({ id, name });
				break;
			}
		}
	}

	return { headings, bodyByContentID, headingIdByContentID };
});

/**
 * The nav is only worth the column it sits in once a page has enough sections to
 * get lost in. The short hubs (/docs/web-studio, /docs/page-management) have a
 * hero and a single "Start here" list; a one-item "On this page" is noise.
 */
export const MIN_HEADINGS_FOR_PAGE_NAV = 3;

/** On-this-page headings for a module page, or [] when it has too few to bother. */
export const getPageHeadings = (page: any): ArticleHeading[] => {
	const { headings } = renderPageSections(page);
	return headings.length >= MIN_HEADINGS_FOR_PAGE_NAV ? headings : [];
};
