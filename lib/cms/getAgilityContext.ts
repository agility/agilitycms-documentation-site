import "server-only";

import { isDevMode } from "lib/cms/isDevMode";

import { draftMode } from "next/headers";
import { connection } from "next/server";
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
	const isPreview = isDevelopmentMode || isDraftMode;

	// Preview/dev serves request-time staging content, so the CMS reads bypass
	// 'use cache'. Those uncached SDK fetches read Date.now() (cache-buster)
	// outside a cache scope, which Cache Components forbids during a prerender
	// pass (AGENTS.md §Gotchas). draftMode() reads as disabled during prerender,
	// so it can't mark this render dynamic on its own — connection() does, opting
	// preview out of prerendering entirely (which is correct: preview is never
	// static). Published requests (isPreview=false) skip this and stay cacheable.
	if (isPreview) await connection();

	const locale =
		requestedLocale && isValidLocale(requestedLocale) ? requestedLocale : defaultLocale;

	return {
		locale,
		sitemap: process.env.AGILITY_SITEMAP || "website",
		isPreview,
		isDevelopmentMode,
	};
};
