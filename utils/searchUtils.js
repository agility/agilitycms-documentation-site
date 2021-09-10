import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import truncate from 'truncate-html';
import { getArticleDescription } from './linkUtils';

const normalizeArticle = async ({ article, category, url }) => {
    const content = JSON.parse(article.fields.content);
    if(!category) {
        category = await getCategoryOfSection({sectionContentID: article.fields.section.contentID});
    }
    let categoryLabel = 'Page';
    if(category) {
        categoryLabel = category.fields.title;
    }

    let sectionLabel = null;
    if(article.fields.section) {
        sectionLabel = article.fields.section.fields.title;
    }

    let conceptLabel = null;
    if(article.fields.concept) {
        conceptLabel = article.fields.concept.fields.title;
    }

    const object = {
        objectID: article.contentID,
        title: article.fields.title,
        description: getArticleDescription(article),
        headings: getHeadings(content.blocks),
        section: sectionLabel,
        concept: conceptLabel,
        url: `${url}`,
        category: categoryLabel,
        itemOrder: article.properties.itemOrder
    }

    return object;
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

const getHeadings = (blocks) => {
    const headings = [];
    blocks.forEach((block) => {
        console.log(block);
        if(block.type === 'header') {
            headings.push(block.data.text);
        }
    });
    return headings;
}

const convertBlocksToIndexableContent = (blocks) => {
    const textArr = [];
    blocks.map((block) => {
        if(block.type === 'paragraph') {
            textArr.push(block.data.text)
        }
        if(block.type === 'header') {
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

    truncate.setup({ 
        stripTags: true,
         length: 100,
         decodeEntities: true,
         reserveLastWord: true
    })

    return truncate(textArr.join(' '));
}

export {
    normalizeArticle
}