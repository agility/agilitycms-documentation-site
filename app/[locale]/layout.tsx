import React, { Suspense } from "react";
import Script from "next/script";
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
 * Locale layout: renders the site chrome. The CMS-driven pieces (Header, the
 * preview-only Web Studio script) live inside their own <Suspense> boundaries
 * so their request-time work — getAgilityContext's connection() in preview and
 * the uncached-in-preview header fetch — streams instead of blocking the whole
 * route (Next "blocking-route"). `children` is likewise wrapped so a dynamic
 * page streams under the static shell. Templates render the Footer themselves
 * (it lives inside their scroll container).
 */
export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	return (
		<div id="SiteWrapper" className="min-h-full font-muli">
			<GoogleTagManager gtmId="GTM-NJW8WMX" />
			<ClientInit />
			<div id="Site" className="flex flex-col min-h-full">
				<Suspense
					fallback={<div className="h-16 shrink-0 border-b border-(--border)" aria-hidden="true" />}
				>
					<SiteHeader requestedLocale={locale} />
				</Suspense>
				<Suspense>{children}</Suspense>
			</div>

			<Suspense>
				<PreviewScripts requestedLocale={locale} />
			</Suspense>
		</div>
	);
}

/**
 * Header chrome in its own async boundary — fetches the nav/header container
 * (cached with tags; uncached in preview) and renders the sticky top bar.
 */
async function SiteHeader({ requestedLocale }: { requestedLocale: string }) {
	const { locale, isPreview } = await getAgilityContext(requestedLocale);
	const headerData = await getHeaderData({ locale, preview: isPreview });

	return (
		<Header
			mainMenuLinks={headerData.mainMenuLinks}
			primaryDropdownLinks={headerData.primaryDropdownLinks}
			secondaryDropdownLinks={headerData.secondaryDropdownLinks}
		/>
	);
}

/**
 * Agility Web Studio SDK — in-context editing. Loaded ONLY in preview/dev
 * (isPreview = draft mode OR local dev), never on the public production site.
 * Pairs with the data-agility-* attributes on the page wrapper and CMS modules.
 */
async function PreviewScripts({ requestedLocale }: { requestedLocale: string }) {
	const { isPreview } = await getAgilityContext(requestedLocale);
	if (!isPreview) return null;

	return (
		<Script
			src="https://unpkg.com/@agility/web-studio-sdk@latest/dist/index.js"
			strategy="afterInteractive"
		/>
	);
}
