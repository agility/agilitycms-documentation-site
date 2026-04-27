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
                      markdownContent
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

    //configure index settings
    await index.setSettings({
        searchableAttributes: ['title', 'headings', 'unordered(body)', 'description'],
        attributesToSnippet: ['body:30'],
    });

    // Atomic full rebuild: replaceAllObjects copies into a temp index and renames,
    // so any record not in `objects` (deleted/unpublished/orphaned) is removed.
    await index.replaceAllObjects(objects, { safe: true });

    res.status(200).json({ ok: true, count: objects.length });
};


