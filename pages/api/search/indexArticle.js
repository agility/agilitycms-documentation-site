import algoliasearch from "algoliasearch";
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageURL } from "@agility/nextjs/node";
import { normalizeArticle } from "utils/searchUtils";

const algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);
const index = algoliaClient.initIndex("doc_site");

export default async (req, res) => {
  
    const referenceName = req.body.referenceName;

    if(!referenceName || !/^[a-zA-Z_]+articles$/.test(referenceName)) {
        //kickout
        res.status(200).end();
        return;
    }

    const contentID = parseInt(req.body.contentID, 10);
    if(isNaN(contentID)) {
        res.status(400).json({ error: 'Invalid contentID' });
        return;
    }
    const state = req.body.state;

    if(contentID && state && (state === 'Deleted' || state === 'Unpublished')) {
        await index.deleteObject(`${contentID}`);
        res.status(200).json({ deleted: contentID, state });
        return;
    }

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
                    markdownContent
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

    const article = data[referenceName] && data[referenceName][0];

    // If the article isn't returned by the published API, it's been unpublished/removed.
    // Strip it from the index so search results stay in sync.
    if(!article) {
        await index.deleteObject(`${contentID}`);
        res.status(200).json({ deleted: contentID, reason: 'not-published' });
        return;
    }

    const url = await getDynamicPageURL({
        contentID: article.contentID,
        preview: false
    })

    const object = await normalizeArticle({
        article,
        url
    })

    await index.saveObject(object)

    res.status(200).json({ saved: contentID });
};





