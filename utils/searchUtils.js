import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";

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

export {
    normalizeArticle
}