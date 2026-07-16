import "server-only";

import { isDevMode } from "lib/cms/isDevMode";

import { draftMode } from "next/headers";
import { defaultLocale, isValidLocale } from "lib/i18n/config";

export interface AgilityContext {
	locale: string;
	sitemap: string;
	isPreview: boolean;
	isDevelopmentMode: boolean;
}

/**
 * Request-scoped Agility context: validated locale, channel name, and preview
 * state (draft mode or local dev). draftMode() is prerender-safe — it reads as
 * disabled during static generation, so published pages stay fully cacheable.
 */
export const getAgilityContext = async (requestedLocale?: string): Promise<AgilityContext> => {
	const isDevelopmentMode = isDevMode();
	const { isEnabled: isDraftMode } = await draftMode();

	const locale =
		requestedLocale && isValidLocale(requestedLocale) ? requestedLocale : defaultLocale;

	return {
		locale,
		sitemap: process.env.AGILITY_SITEMAP || "website",
		isPreview: isDevelopmentMode || isDraftMode,
		isDevelopmentMode,
	};
};
