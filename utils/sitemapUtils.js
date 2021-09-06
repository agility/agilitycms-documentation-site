import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";

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

export {
    getDynamicPageSitemapMapping,
    READ_SITEMAP_FOR_DYNAMIC_URL_RESOLUTION,
    READ_FULL_SITEMAP
}