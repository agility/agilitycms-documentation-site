import React from "react";
import { GoogleTagManager } from "@next/third-parties/google";

import { getAgilityContext } from "lib/cms/getAgilityContext";
import { getHeaderData } from "lib/cms-content/getHeaderData";
import Header from "components/common/Header";
import ClientInit from "components/common/ClientInit";

export async function generateStaticParams() {
	const { locales } = await import("lib/i18n/config");
	return locales.map((locale) => ({ locale }));
}

/**
 * Locale layout: fetches the header's data (sitemap nav + header container +
 * main-site preheader, all cached with tags) and renders the site chrome.
 * Templates render the Footer themselves (it lives inside their scroll
 * container), and the catch-all page renders the PreviewBar (it needs page
 * context for the edit link).
 */
export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale: requestedLocale } = await params;
	const { locale, isPreview } = await getAgilityContext(requestedLocale);
	const headerData = await getHeaderData({ locale, preview: isPreview });

	return (
		<div id="SiteWrapper" className="min-h-full font-muli">
			<GoogleTagManager gtmId="GTM-NJW8WMX" />
			<ClientInit />
			<div id="Site" className="flex flex-col min-h-full">
				<Header
					mainMenuLinks={headerData.mainMenuLinks}
					primaryDropdownLinks={headerData.primaryDropdownLinks}
					secondaryDropdownLinks={headerData.secondaryDropdownLinks}
					marketingContent={headerData.marketingContent}
					preHeader={headerData.preHeader}
				/>
				{children}
			</div>
		</div>
	);
}
