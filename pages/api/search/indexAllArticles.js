import algoliasearch from "algoliasearch";
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageSitemapMappingREST } from "utils/sitemapUtils";
import { normalizeArticle } from "utils/searchUtils";


const algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);
const index = algoliaClient.initIndex("doc_site");

export default async (req, res) => {

    
    const { data } = await client.query({
        query: gql`    
        {
            doccategories  {
                contentID
                fields {
                  title
                  subTitle
                  articles {
                    properties {
                      itemOrder
                    }
                    contentID
                    fields {
                      title
                      content
                      description
                      section {
                        fields {
                          title
                        }
                      }
                      concept {
                        fields {
                          title
                        }
                      }
                    }
                  }
                }
              }
        }`,
    });
    
    const articleUrls = await getDynamicPageSitemapMappingREST();

    let objects = [];
    for(const cat of data.doccategories) {
        if(cat.fields.articles) {
            for(const article of cat.fields.articles) {
                const object = await normalizeArticle({
                    article,
                    url: articleUrls[article.contentID],
                    category: cat
                });
                objects.push(object);
            }
        }
    }

    //save it in Algolia
    await index.saveObjects(objects)

    res.status(200).json(true);
};


