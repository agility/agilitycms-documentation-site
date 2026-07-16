import React from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getAgilityContext } from "lib/cms/getAgilityContext";
import { getAgilityPage } from "lib/cms/getAgilityPage";
import { getAgilitySDK_NonReact } from "lib/cms/getAgilitySDK";
import { resolveAgilityMetaData } from "lib/cms-content/resolveAgilityMetaData";
import { getRichSnippet } from "lib/cms-content/getRichSnippet";
import { getPageTemplate } from "components/agility-pageTemplates";
import PreviewBar from "components/common/PreviewBar";
import { locales } from "lib/i18n/config";

export interface PageProps {
	params: Promise<{ locale: string; slug: string[] }>;
}

/**
 * Pre-render every published, non-folder, non-redirect path for every locale
 * (pattern from demosite2025). Paths not listed here still render on demand.
 */
export async function generateStaticParams() {
	// Cache Components requires at least one result here (build-time
	// validation), so we always walk the published sitemap — no dev shortcut.
	const sdk = getAgilitySDK_NonReact({ isPreview: false });
	const allPaths: { locale: string; slug: string[] }[] = [];

	for (const locale of locales) {
		const sitemap = await sdk.getSitemapFlat({
			channelName: process.env.AGILITY_SITEMAP || "website",
			languageCode: locale,
		});

		const localePaths = Object.values(sitemap as any)
			.filter(
				(node: any) =>
					node.redirect === null &&
					node.isFolder !== true &&
					node.path !== "/404" &&
					node.path !== "/500"
			)
			.map((node: any) => ({ locale, slug: node.path.split("/").slice(1) }));

		allPaths.push(...localePaths);
	}

	return allPaths;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale: requestedLocale, slug } = await params;
	const { locale, isPreview } = await getAgilityContext(requestedLocale);
	const agilityData = await getAgilityPage({ locale, slug, preview: isPreview });
	if (agilityData.notFound || !agilityData.page) return {};
	return resolveAgilityMetaData(agilityData);
}

export default async function Page({ params }: PageProps) {
	const { locale: requestedLocale, slug } = await params;
	const { locale, isPreview, isDevelopmentMode } = await getAgilityContext(requestedLocale);

	const agilityData = await getAgilityPage({ locale, slug, preview: isPreview });

	if (agilityData.redirectUrl) {
		redirect(agilityData.redirectUrl);
	}
	if (agilityData.notFound || !agilityData.page) {
		notFound();
	}

	const AgilityPageTemplate = getPageTemplate(agilityData.pageTemplateName || "");
	const jsonLD = getRichSnippet(agilityData);

	return (
		<>
			{/* JSON-LD in the body per Next.js guidance (React hoists it). */}
			{jsonLD && (
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD }} />
			)}
			<div
				data-agility-page={agilityData.page?.pageID}
				data-agility-dynamic-content={agilityData.sitemapNode?.contentID || undefined}
				className="flex flex-col grow overflow-hidden"
			>
				{AgilityPageTemplate ? (
					<AgilityPageTemplate {...agilityData} />
				) : (
					<div className="p-8 text-(--err)">
						No template found for page template name: {agilityData.pageTemplateName}
					</div>
				)}
			</div>
			<PreviewBar
				page={agilityData.page}
				dynamicPageItem={agilityData.dynamicPageItem}
				isPreview={isPreview && !isDevelopmentMode}
				isDevelopmentMode={isDevelopmentMode}
			/>
		</>
	);
}
