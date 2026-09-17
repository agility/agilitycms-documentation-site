import agility from '@agility/content-fetch'

/**
 * Dictionary of dynamic-page URLs by contentID, straight from the Agility
 * REST API (used by the search indexer, which must never read stale data).
 *
 * NOTE: page-render code should use lib/cms/getSitemapFlat (cached + tagged)
 * instead — the old Apollo-cache sitemap trick died with the Pages Router.
 */
const getDynamicPageSitemapMappingREST = async (isPreview: boolean = false): Promise<Record<number, string>> => {
  const api = agility.getApi({
    guid: process.env.AGILITY_GUID,
    apiKey: isPreview ? process.env.AGILITY_API_PREVIEW_KEY : process.env.AGILITY_API_FETCH_KEY,
    isPreview
  })
  const sitemapFlat = await api.getSitemapFlat({
    channelName: process.env.AGILITY_SITEMAP || 'website',
    languageCode: (process.env.AGILITY_LOCALES || 'en-us').split(',')[0].trim()
  })

  let articleUrls: Record<number, string> = {};
  Object.keys(sitemapFlat).forEach((key) => {
    const item = sitemapFlat[key];
    if (item.contentID && item.contentID > 0) {
      articleUrls[item.contentID] = item.path;
    }
  });

  return articleUrls;
}

export {
  getDynamicPageSitemapMappingREST
};
