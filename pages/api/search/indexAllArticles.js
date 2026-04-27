import algoliasearch from "algoliasearch";
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageSitemapMappingREST } from "utils/sitemapUtils";
import { normalizeArticle } from "utils/searchUtils";


const algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);
const index = algoliaClient.initIndex("doc_site");

export default async (req, res) => {

    
    const startedAt = Date.now();

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
        // Always read fresh content for indexing — never serve from Apollo cache.
        fetchPolicy: 'no-cache',
    });

    const articleUrls = await getDynamicPageSitemapMappingREST();

    let objects = [];
    const categoryBreakdown = [];
    for(const cat of data.doccategories) {
        const articles = cat.fields.articles || [];
        categoryBreakdown.push({
            contentID: cat.contentID,
            title: cat.fields.title,
            articleCount: articles.length,
        });
        for(const article of articles) {
            const object = await normalizeArticle({
                article,
                url: articleUrls[article.contentID],
                category: cat
            });
            objects.push(object);
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

    res.status(200).json({
        ok: true,
        index: 'doc_site',
        indexed: objects.length,
        categories: categoryBreakdown.length,
        durationMs: Date.now() - startedAt,
        categoryBreakdown,
        objectIDs: objects.map(o => o.objectID),
    });
};


