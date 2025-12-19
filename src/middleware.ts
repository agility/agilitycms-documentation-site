import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getDynamicPageURL } from "@agility/nextjs/node"

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
	/*****************************
	 * *** AGILITY MIDDLEWARE ***
	 * 1: Check if this is a preview request,
	 * 2: Check if we are exiting preview
	 * 3: Check if this is a direct to a dynamic page
	 *    based on a content id
	 *******************************/

	let pathname = request.nextUrl.pathname
	const previewQ = request.nextUrl.searchParams.get("AgilityPreview")
	let contentIDStr = request.nextUrl.searchParams.get("ContentID") as string || ""

	const ext = request.nextUrl.pathname.includes(".") ? request.nextUrl.pathname.split('.').pop() : null

	if (request.nextUrl.searchParams.has("agilitypreviewkey")) {
		//*** this is a preview request ***
		const agilityPreviewKey = request.nextUrl.searchParams.get("agilitypreviewkey") || ""
		//locale is also passed in the querystring on preview requests
		const locale = request.nextUrl.searchParams.get("lang") || process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us'
		const slug = request.nextUrl.pathname
		//valid preview key: we need to redirect to the correct url for preview
		let redirectUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/preview?locale=${locale}&ContentID=${contentIDStr}&slug=${encodeURIComponent(slug)}&agilitypreviewkey=${encodeURIComponent(agilityPreviewKey)}`

		return NextResponse.redirect(redirectUrl)

	} else if (previewQ === "0") {
		//*** exit preview
		const locale = request.nextUrl.searchParams.get("lang") || process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us'

		//we need to redirect to the correct url for preview
		const slug = request.nextUrl.pathname
		let redirectUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/preview/exit?locale=${locale}&ContentID=${contentIDStr}&slug=${encodeURIComponent(slug)}`

		return NextResponse.redirect(redirectUrl)
	} else if (contentIDStr) {
		const contentID = parseInt(contentIDStr)
		if (!isNaN(contentID) && contentID > 0) {
			//*** this is a dynamic page request ***

			let dynredirectUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/dynamic-redirect?ContentID=${contentID}`
			return NextResponse.rewrite(dynredirectUrl)

		}
	} else if ((!ext || ext.length === 0)) {

		/**********************
		 * CHECK FOR REDIRECT *
		***********************/
		// Note: Redirect checking can be added here if needed
		// For now, skipping redirect checking as it requires getRedirections utility

		/************************
		 * HANDLE SEARCH PARAMS *
		 ************************/

		// Only process query parameters that are expected/used within the app
		// This prevents issues with long tracking query strings (e.g., Google Analytics)
		const ALLOWED_QUERY_PARAMS = ['audience', 'region', 'q'] // Whitelist of allowed query params
		const MAX_QUERY_STRING_LENGTH = 500 // Maximum length for query string encoding

		// Filter search params to only include whitelisted parameters
		const filteredParams = new URLSearchParams()
		for (const [key, value] of request.nextUrl.searchParams.entries()) {
			if (ALLOWED_QUERY_PARAMS.includes(key.toLowerCase())) {
				filteredParams.append(key, value)
			}
		}

		// Only encode if we have allowed params and they're within reasonable length
		let searchParams = filteredParams.toString()
		let hasSearchParams = searchParams && searchParams.length > 0 && searchParams.length <= MAX_QUERY_STRING_LENGTH

		if (hasSearchParams) {
			const searchParamPortion = `~~~${encodeURIComponent(searchParams)}~~~`
			//if we have search params, we need to include them in the path like this /path/->/path/~~~searchParams~~~
			pathname = pathname.endsWith("/") ? `${pathname}${searchParamPortion}` : `${pathname}/${searchParamPortion}`
		} else {
			searchParams = ""
		}

		// Note: Locale routing removed since this is a single locale site
		// When multi-locale is added, locale routing logic can be added here

		if (hasSearchParams) {
			//if we have search params, we need to make sure we decode them before passing them on
			const searchParamUrl = new URL(pathname, request.nextUrl.origin)
			return NextResponse.rewrite(searchParamUrl)
		}

		// If we reach here, let Next.js handle the request normally
		return NextResponse.next()

	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - assets (public assets)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - sitemap.xml (sitemap file)
		 * - robots.txt (robots file)
		 */
		'/((?!api|assets|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
	],
}
