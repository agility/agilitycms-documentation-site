import agility from '@agility/content-fetch'
import FuzzySearch from 'fuzzy-search'
import { NextRequest, NextResponse } from 'next/server'
import nextConfig from '../../../../../next.config'

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const query = searchParams.get('q')

	if (!query) {
		return NextResponse.json(
			{ success: false, message: 'Query parameter "q" is required' },
			{ status: 400 }
		)
	}

	//create the Agility CMS content fetch client
	const api = agility.getApi({
		guid: process.env.AGILITY_GUID,
		apiKey: process.env.AGILITY_API_PREVIEW_KEY,
		isPreview: true
	});

	//get the sitemap
	const sitemap = await api.getSitemapFlat({
		channelName: 'website',
		languageCode: process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us'
	})

	//convert sitemap to searchable array
	let searchableArray = [];
	for (const [key, value] of Object.entries(sitemap)) {
		searchableArray.push(value);
	}

	const searcher = new FuzzySearch(searchableArray, ['title', 'menuText', 'path']);

	const searchResults = searcher.search(query);

	const results = searchResults.map((item: any) => {
		return {
			href: `${nextConfig.basePath}${item.path}`,
			name: item.title,
			description: `${nextConfig.basePath}${item.path}`
		}
	})

	//return the search results
	return NextResponse.json({
		success: true,
		items: results
	});
}
