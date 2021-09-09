import algoliasearch from "algoliasearch";
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageURL } from "@agility/nextjs/node";
import truncate from "truncate-html";

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
                    section {
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

    const content = JSON.parse(article.fields.content);
    const category = await getCategoryOfSection({sectionContentID: article.fields.section.contentID});
    let categoryLabel = 'Page';

    if(category) {
        categoryLabel = category.fields.title;
    }

    let sectionLabel = null;
    if(article.fields.section) {
        sectionLabel = article.fields.section.title;
    }

    const object = {
        objectID: article.contentID,
        title: article.fields.title,
        content: convertBlocksToIndexableContent(content.blocks),
        section: sectionLabel,
        url: `${url}`,
        category: categoryLabel
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

const getCategoryOfSection = async ({sectionContentID}) => {
    const { data } = await client.query({
        query: gql`    
        {
            doccategories  {
                contentID
                fields {
                  title
                  subTitle
                  sections {
                    contentID
                  }
                }
              }
        }`,
    });

    const category = data.doccategories.find((cat) => {
        if(cat.fields.sections) {
            return cat.fields.sections.find((section) => section.contentID === sectionContentID);
        }
    })

    return category;

}

