import { type PageProps, getAgilityPage } from "../../lib/cms/getAgilityPage"
import { getAgilityContext } from "../../lib/cms/getAgilityContext"
// import agilitySDK from "@agility/content-fetch" // Temporarily disabled for generateStaticParams
import { getPageTemplate } from "../../components/agility-pages"

import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import PreviewWidget from "../../components/common/PreviewWidget"
import CMSWidget from "../../components/common/CMSWidget"
import LoadingWidget from "../../components/common/LoadingWidget"
import { getFooterContent } from "../../lib/cms-content/getFooterContent"
import Footer from "components/common/Footer"
import WithSidebarNavTemplate from "components/agility-pages/WithSidebarNavTemplate"

export const revalidate = 60
export const runtime = "nodejs"

/**
 * Generate the list of pages that we want to generate at build time.
 *
 * TEMPORARY: Disabled static generation to test if build succeeds.
 * The site will use ISR (Incremental Static Regeneration) with revalidate: 60
 * instead of SSG (Static Site Generation).
 *
 * TODO: Re-enable once we identify the module causing the build error.
 */
export async function generateStaticParams() {
	// Temporarily return empty array to disable static generation
	console.log("⚠️ Static generation disabled - using ISR instead");
	return [];

	/* ORIGINAL CODE - RE-ENABLE AFTER FIXING BUILD ERROR:
	const isDevelopmentMode = process.env.NODE_ENV === "development";
	const isPreview = isDevelopmentMode;
	const apiKey = isPreview ? process.env.AGILITY_API_PREVIEW_KEY : process.env.AGILITY_API_FETCH_KEY;
	const agilityClient = agilitySDK.getApi({
		guid: process.env.AGILITY_GUID,
		apiKey,
		isPreview,
	});

	const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';

	agilityClient.config.fetchConfig = {
		next: {
			tags: [`agility-sitemap-flat-${locale}`],
			revalidate: 60,
		},
	};

	// Get the flat sitemap for this locale
	const sitemap = await agilityClient.getSitemapFlat({
		channelName: process.env.AGILITY_SITEMAP || "website",
		languageCode: locale,
	});

	const paths = Object.values(sitemap)
		.filter((node) => {
			if (node.redirect !== null || node.isFolder === true) return false;
			// Remove 404 and 500 pages
			if (node.path === "/404" || node.path === "/500") return false;
			return true;
		})
		.map((node) => {
			return {
				slug: node.path.split("/").slice(1), // Remove leading slash and split
			};
		});

	console.log("Pre-rendering", paths.length, "static paths.");
	return paths;
	*/
}

/**
 * Generate metadata for this page
 */
export async function generateMetadata(
	props: PageProps,
	_parent: ResolvingMetadata
): Promise<Metadata> {
	const { params } = props;
	const agilityData = await getAgilityPage({ params });

	if (!agilityData.page || agilityData.notFound) {
		return {
			title: 'Page Not Found',
		};
	}

	const { page, sitemapNode, dynamicPageItem } = agilityData;

	// Handle dynamic page item meta overrides
	let pageTitle = sitemapNode?.title || 'Agility CMS Documentation';
	let metaDescription = page.seo?.metaDescription || '';

	// if we have a dynamic item and it has a field called `description` use it
	if (dynamicPageItem?.fields?.description && dynamicPageItem.fields.description.length > 0) {
		metaDescription = dynamicPageItem.fields.description;
	}

	// set the meta description for a dynamic item
	if (dynamicPageItem?.seo?.metaDescription && dynamicPageItem.seo.metaDescription.length > 0) {
		metaDescription = dynamicPageItem.seo.metaDescription;
	}

	// set the meta title for a dynamic item
	if (dynamicPageItem?.fields?.metaTitle && dynamicPageItem.fields.metaTitle.length > 0) {
		pageTitle = dynamicPageItem.fields.metaTitle;
	}

	// Build metadata object
	const metadata: Metadata = {
		title: pageTitle,
		description: metaDescription,
	};

	// Add keywords if present
	if (page.seo?.metaKeywords) {
		metadata.keywords = page.seo.metaKeywords;
	}

	// Handle noIndex for dynamic items
	if (dynamicPageItem?.seo?.sitemapVisible === false) {
		metadata.robots = {
			index: false,
			follow: false,
		};
	}

	return metadata;
}

export default async function Page({ params }: PageProps) {
	const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';
	const { isPreview, isDevelopmentMode } = await getAgilityContext(locale);

	// Fetch Agility page data
	const agilityData = await getAgilityPage({ params });

	if (!agilityData.page || agilityData.notFound) {
		notFound();
	}

	// Get the page template
	const AgilityPageTemplate = getPageTemplate(agilityData.pageTemplateName || "");

	if (!AgilityPageTemplate) {
		return <div>No template found for: {agilityData.pageTemplateName}</div>;
	}

	const { page, dynamicPageItem } = agilityData;

	// Combine all props for page template
	const pageProps = {
		...agilityData,
		isPreview,
		isDevelopmentMode
	};

	return (


		<>
			<AgilityPageTemplate {...pageProps} />

			<PreviewWidget isPreview={isPreview} isDevelopmentMode={isDevelopmentMode} />
			<CMSWidget
				page={page}
				dynamicPageItem={dynamicPageItem}
				isPreview={isPreview}
				isDevelopmentMode={isDevelopmentMode}
			/>
		</>


	);
}
