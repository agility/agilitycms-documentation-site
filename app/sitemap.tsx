import agility from '@agility/content-fetch'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	//create the Agility CMS content fetch client
	const api = agility.getApi({
		guid: process.env.AGILITY_GUID,
		apiKey: process.env.AGILITY_API_FETCH_KEY,
		isPreview: false
	});

	//get the flat sitemap from Agility CMS
	const sitemapFlat = await api.getSitemapFlat({
		channelName: process.env.AGILITY_SITEMAP || "website",
		languageCode: process.env.AGILITY_LOCALES?.split(',')[0] || "en-us"
	})

	const baseUrl = 'https://agilitycms.com/docs'

	const urls: MetadataRoute.Sitemap = Object.keys(sitemapFlat)
		.filter(path => {
			const sitemapNode = sitemapFlat[path]
			if (sitemapNode.redirect || sitemapNode.isFolder) {
				return false
			}
			return true
		})
		.map((path, index) => {
			const url = index === 0 ? baseUrl : `${baseUrl}${path}`
			return {
				url,
				lastModified: new Date(),
				changeFrequency: 'daily' as const,
				priority: 1,
			}
		})

	return urls
}
