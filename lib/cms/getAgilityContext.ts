import { draftMode } from 'next/headers';
import { agilityConfig } from "@agility/nextjs"

/**
 * Gets the Agility context for the current request.
 * Note: This site currently supports single locale, but function accepts locale for future multi-locale support.
 */
export const getAgilityContext = async (locale?: string) => {
	//determine if we're in preview mode based on "draft" mode from next.js
	const { isEnabled } = await draftMode()

	const isDevelopmentMode = process.env.NODE_ENV === "development"

	//determine whether it's preview or dev mode
	const isPreview = isEnabled || isDevelopmentMode

	// For single locale site, use locale from env or default
	// When multi-locale is added, validate the provided locale
	const defaultLocale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us'
	const validatedLocale = locale || defaultLocale

	return {
		locales: agilityConfig.locales,
		locale: validatedLocale,
		sitemap: agilityConfig.channelName,
		isPreview,
		isDevelopmentMode
	}
}
