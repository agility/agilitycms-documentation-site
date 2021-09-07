import agility from '@agility/content-fetch'
import FuzzySearch from 'fuzzy-search'
import nextConfig from 'next.config';

export default async function handler(req, res) {

  // Process a GET request
  if (req.method === 'GET') {
    
    //create the Agility CMS content fetch client
    const api = agility.getApi({
        guid: process.env.AGILITY_GUID, 
        apiKey: process.env.AGILITY_API_PREVIEW_KEY, 
        isPreview: true
    });

    //get the sitemap
    const sitemap = await api.getSitemapFlat({
        channelName: 'website',
        languageCode: 'en-us'
    })

    //use the query to filter matched urls from the sitemap
    const query = req.query.q;

    //convert sitemap to searchable array
    let searchableArray = [];
    for(const [key, value] of Object.entries(sitemap)) {
      searchableArray.push(value);
    }

    const searcher = new FuzzySearch(searchableArray, ['title', 'menuText', 'path']);

    const searchResults = searcher.search(query);

    const results = searchResults.map(item => {
      return {
        href: `${nextConfig.basePath}${item.path}`, 
        name: item.title,
        description: `${nextConfig.basePath}${item.path}`
      }
    })


    //return the uploaded file details
    res.status(200).json({ 
        success: true,
        items: results
    });
    
  } else {
    // Handle any other HTTP method
    res.status(500).json({ 
      success: 0,
      message: 'Request method not supported.'
    });
  }
}