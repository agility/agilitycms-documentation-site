import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import agility from '@agility/content-fetch'

const getDynamicPageSitemapMapping = ()  => {
    //get the sitemap from cache
    const { sitemap } = client.readQuery({
        query: READ_SITEMAP_FOR_DYNAMIC_URL_RESOLUTION,
        variables: {},
    });
    
    //build dictionary of dynamic page urls by contentID for url resolution
    let articleUrls = {};
    sitemap.forEach((item) => {
        if (item.contentID && item.contentID > 0) {
            articleUrls[item.contentID] = item.path;
        }
    });
    return articleUrls;
}

const READ_SITEMAP_FOR_DYNAMIC_URL_RESOLUTION = gql`
    query ReadSitemapFlat {
      sitemap {
        path
        contentID        
      }
    }
`;

const READ_SITEMAP_FOR_HEADER = gql`
    query ReadSitemapFlat {
      sitemap {
        menuText
        path
        visible {
          menu
        }
      }
    }
`;

const READ_FULL_SITEMAP = gql`
    query ReadSitemapFlat {
      sitemap {
        title
        name
        path
        pageID
        isFolder
        redirect  
        visible {
          menu
          sitemap
        }
        contentID        
      }
    }
`;

const getDynamicPageSitemapMappingREST = async (isPreview) => {
  const api = agility.getApi({
    guid: process.env.AGILITY_GUID,
    apiKey: isPreview ? process.env.AGILITY_API_PREVIEW_KEY : process.env.AGILITY_API_FETCH_KEY,
    isPreview
  })
  const sitemapFlat = await api.getSitemapFlat({
    channelName: 'website',
    languageCode: 'en-us'
  })

  let articleUrls = {};
    Object.keys(sitemapFlat).forEach((key) => {
        const item = sitemapFlat[key];
        if (item.contentID && item.contentID > 0) {
            articleUrls[item.contentID] = item.path;
        }
    });
    
  return articleUrls;

}

export {
    getDynamicPageSitemapMapping,
    getDynamicPageSitemapMappingREST,
    READ_SITEMAP_FOR_DYNAMIC_URL_RESOLUTION,
    READ_FULL_SITEMAP,
    READ_SITEMAP_FOR_HEADER
}