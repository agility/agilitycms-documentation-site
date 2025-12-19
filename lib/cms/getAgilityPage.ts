import "server-only";
import { getAgilityPageProps } from "@agility/nextjs/node";
import { getAgilityContext } from "./getAgilityContext";
import { getModule } from "components/agility-components";

export interface PageProps {
	params: Promise<{ slug: string[] }>
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

/**
 * Get a page with caching information added.
 * Note: Adapted for single locale site (no locale in params)
 * Note: Assumes basePath of /docs - removes it from slug before fetching
 */
export const getAgilityPage = async ({ params }: PageProps) => {
	const awaitedParams = await params
	const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us'
	const { isPreview: preview } = await getAgilityContext(locale)

	if (!awaitedParams.slug) awaitedParams.slug = [""]

	// Add "docs" prefix to slug for Agility CMS lookup
	// Next.js strips /docs basePath, but Agility sitemap has paths like /docs/overview
	// So we need to add it back before fetching from Agility
	const slugWithBasePath = ["docs", ...awaitedParams.slug]


	//check the last element of the slug to see if it has search params encoded (from middleware)
	let lastSlug = awaitedParams.slug[awaitedParams.slug.length - 1]
	let searchParams: { [key: string]: string } = {}
	if (lastSlug && lastSlug.startsWith("~~~") && lastSlug.endsWith("~~~")) {
		//we have search params encoded here
		lastSlug = lastSlug.replace(/~~~+/g, "")
		const decoded = decodeURIComponent(lastSlug)
		const parts = decoded.split("&").map(part => part.trim())

		parts.forEach(part => {
			const kvp = part.split("=")
			if (kvp.length === 2) {
				searchParams[kvp[0]] = kvp[1]
			}
		})

		awaitedParams.slug = awaitedParams.slug.slice(0, awaitedParams.slug.length - 1)
		if (awaitedParams.slug.length === 0) awaitedParams.slug = [""]
	}


	//get the page
	const page = await getAgilityPageProps({
		params: awaitedParams,
		preview,
		locale,
		apiOptions: {
			expandAllContentLinks: false, //override this so that we don't get too much data back in GetPage API calls
			contentLinkDepth: 2,
		}
	})

	page.globalData = page.globalData || {};
	page.globalData["searchParams"] = searchParams;

	return page
}
