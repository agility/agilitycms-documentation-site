import algoliasearch from "algoliasearch";
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageURL } from "@agility/nextjs/node";
import nextConfig from "next.config";

const algoliaClient = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);
const index = algoliaClient.initIndex("doc_site");

export default async (req, res) => {
  
    const referenceName = req.body.referenceName;

    if(!referenceName.endsWith('articles')) {
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
                    section {
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

    const content = JSON.parse(article.fields.content);

    //TODO: add the category of this article
    const object = {
        objectID: article.contentID,
        title: article.fields.title,
        content: convertBlocksToIndexableContent(content.blocks),
        section: article.fields.section.fields.title,
        url: `${nextConfig.basePath}${url}`
    }

    //save it in Algolia
    await index.saveObject(object)

    res.status(200).json(object);
};

const convertBlocksToIndexableContent = (blocks) => {
    const textArr = [];
    blocks.map((block) => {
        if(block.type === 'paragraph') {
            textArr.push(block.data.text)
        }
        // if(block.type === 'table') {
        //     textArr.push(block.data.content)
        // }
        // if(block.type === 'code') {
        //     textArr.push(block.data.code)
        // }
        // if(block.list === 'list') {
        //      const listItemsTextArr = block.data.items.map((item) => {
        //         listItemsTextArr.push(item.content);
        //     })
        //     textArr.concat(listItemsTextArr);
        // }
    })

    return textArr.join(' ').replace(/(<([^>]+)>)/ig, '').replace(/&nbsp;/g, ' ');
}

