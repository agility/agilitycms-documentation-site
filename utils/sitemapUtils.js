const getDynamicPageSitemapMapping = async ({ agilityApiClient, channelName, languageCode })  => {
    //get the sitemap so we can resolve the urls
    let sitemap = await agilityApiClient.getSitemapFlat({
        channelName: channelName,
        languageCode,
    });

    //build dictionary of dynamic page urls by contentID for url resolution
    let articleUrls = {};
    Object.keys(sitemap).forEach((path) => {
        if (sitemap[path].contentID && sitemap[path].contentID > 0) {
        articleUrls[sitemap[path].contentID] = path;
        }
    });

    return articleUrls;
}



export {
    getDynamicPageSitemapMapping
}