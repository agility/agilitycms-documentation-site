/**
 * Shared schema.org entity nodes for the docs site.
 *
 * WHY @id AND A @graph
 * --------------------
 * Every page used to inline its own anonymous `Organization` as `publisher`.
 * Anonymous nodes don't merge: a crawler reading 300 articles sees 300
 * unrelated organizations, and none of them connects to the one the marketing
 * site publishes on agilitycms.com. Giving the organization a single stable
 * `@id` and referencing it by `{"@id": …}` everywhere makes all of it one
 * entity — which is what both search engines and LLM crawlers key on.
 *
 * The `@id` values are URIs, not URLs — nothing has to resolve. They are
 * deliberately rooted at the APEX (`https://agilitycms.com/#organization`),
 * not at /docs, so that when the marketing site adopts the same `@id` the two
 * sites' graphs reconcile into one organization rather than two.
 *
 * ⚠️ The marketing site (Agility-Website-Nextjs-2026) currently emits an
 * Organization with NO `@id`. Until it adds `"@id": ORG_ID`, the docs graph is
 * internally consistent but still separate from the apex's. The `sameAs` list
 * below is kept a superset of the marketing site's so the two remain
 * reconcilable by profile match in the meantime.
 */

export const SITE_URL = "https://agilitycms.com/docs";
const APEX_URL = "https://agilitycms.com";

/** Stable node identifiers. Referenced, never duplicated. */
export const ORG_ID = `${APEX_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** A reference to a node defined elsewhere in the same @graph. */
export const ref = (id: string) => ({ "@id": id });

/**
 * The Agility CMS organization. Fields mirror the marketing site's node
 * (name/url/foundingDate/sameAs) so the two describe the same entity; the
 * logo and the developer profiles are additions that belong on a docs surface.
 *
 * Every URL here was checked to resolve — a `sameAs` pointing at nothing is
 * worse than no `sameAs` at all, because it asserts an identity that can't be
 * confirmed.
 */
export const organizationNode = () => ({
	"@type": "Organization",
	"@id": ORG_ID,
	name: "Agility CMS",
	url: APEX_URL,
	foundingDate: "2003",
	logo: {
		"@type": "ImageObject",
		url: `${APEX_URL}/assets/agility-logo.svg`,
	},
	sameAs: [
		"https://www.g2.com/products/agility-cms/reviews",
		"https://www.linkedin.com/company/agility-cms",
		"https://machalliance.org/members/agility-cms",
		"https://github.com/agility",
	],
});

/**
 * The docs site itself.
 *
 * NO `potentialAction`/SearchAction — deliberately. The sitelinks searchbox is
 * one of the few rich results Google did NOT retire in 2023, so it's worth
 * claiming, but only once there is something to claim: Algolia search here is
 * a modal with no URL behind it, and `/docs/search?q=` 404s (verified
 * 2026-09-20). A SearchAction pointing at a 404 asserts a capability the site
 * doesn't have, which is worse than omitting it.
 *
 * To turn this on: ship a real crawlable `/docs/search?q=…` results page
 * (it also fixes deep-linking a search, which readers expect), add it to
 * APP_PATHS in proxy.ts, then add:
 *
 *   potentialAction: {
 *     "@type": "SearchAction",
 *     target: { "@type": "EntryPoint",
 *               urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
 *     "query-input": "required name=search_term_string",
 *   }
 */
export const webSiteNode = () => ({
	"@type": "WebSite",
	"@id": WEBSITE_ID,
	name: "Agility CMS Documentation",
	url: SITE_URL,
	inLanguage: "en-US",
	publisher: ref(ORG_ID),
});

/** Wrap nodes in the @graph envelope that carries the shared @context. */
export const graph = (nodes: object[]) =>
	JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
