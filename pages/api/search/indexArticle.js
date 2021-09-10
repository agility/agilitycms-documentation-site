import algoliasearch from "algoliasearch";
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageURL } from "@agility/nextjs/node";
import { normalizeArticle } from "utils/searchUtils";

const algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);
const index = algoliaClient.initIndex("doc_site");

export default async (req, res) => {
  
    const referenceName = req.body.referenceName;

    if(!referenceName || !referenceName.endsWith('articles')) {
        //kickout
        res.status(200).end();
        return;
    }

    const contentID = req.body.contentID;
    
    const { data } = await client.query({
        query: gql`    
        {
            ${referenceName} (contentID: ${contentID})  {
                contentID
                properties {
                    itemOrder
                }
                fields {
                    title
                    content
                    description
                    section {
                        contentID
                        fields {
                            title
                        }
                    }
                    concept {
                        contentID
                        fields {
                            title
                        }
                    }
                }
            }
        }`,
    });
    
    const article = data[referenceName][0];

    const url = await getDynamicPageURL({
        contentID: article.contentID,
        preview: false
    })

    const object = await normalizeArticle({
        article,
        url
    })

    //save it in Algolia
    await index.saveObject(object)

    res.status(200).json(object);
};





