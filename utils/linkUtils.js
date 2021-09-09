import truncate from 'truncate-html'
import { getDynamicPageSitemapMapping } from "./sitemapUtils";

const normalizeListedLinks = ({ listedLinks }) => {

    const articleUrls = getDynamicPageSitemapMapping();

    const list = listedLinks.map((item) => {
        const hasArticle = item.fields.article;
        if(hasArticle) {
            return {
                title: item.fields.article.fields.title,
                href: articleUrls[item.fields.article.contentID],
                description: item.fields.article.fields.description ? item.fields.article.fields.description : item.fields.description,
                icon: item.fields.article.fields.concept ? item.fields.article.fields.concept.fields.icon : null
            }
        } else {
            return {
                title: item.fields.explicitURL.text,
                href: item.fields.explicitURL.href,
                description: item.fields.description,
                icon: item.fields.explicitIcon
            }
        }
    })

    return list;
}

const normalizeListedArticles = ({ listedArticles }) => {
    const articleUrls = getDynamicPageSitemapMapping();

    const list = listedArticles.map((item) => {
        const article = item.fields.article;
        let description = article.fields.description;
        if(!description) {
            const firstParagraph = JSON.parse(article.fields.content).blocks.find((block) => block.type === 'paragraph');
            console.log(firstParagraph)
            if(firstParagraph) {
                truncate.setup({
                    stripTags: true,
                    length: 155
                })
                description = truncate(firstParagraph.data.text);
            } else {
                description = null;
            }
        }
        if(article) {
            return {
                title: article.fields.title,
                href: articleUrls[article.contentID],
                description: description,
                concept: article.fields.concept ? article.fields.concept.fields.title : null,
                icon: article.fields.concept ? article.fields.concept.fields.icon : null
            }
        } else {
            return null;
        }
    })

    return list.filter((article) => article !== null);
}


export {
    normalizeListedLinks,
    normalizeListedArticles
}