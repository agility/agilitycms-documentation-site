import truncate from 'truncate-html'
import { getDynamicPageSitemapMapping } from "./sitemapUtils";

const normalizeListedLinks = ({ listedLinks }) => {

    const articleUrls = getDynamicPageSitemapMapping();

    const list = listedLinks.map((item) => {
        const article = item.fields.article;
        
        if(article) {
            let description = getArticleDescription(article);
            return {
                title: article.fields.title,
                href: articleUrls[article.contentID],
                description: description,
                icon: article.fields.concept ? article.fields.concept.fields.icon : null
            }
        } else {
            return {
                title: item.fields.explicitURL?.text,
                href: item.fields.explicitURL?.href,
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
        if(article) {
            let description = getArticleDescription(article);
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

const getArticleDescription = (article) => {
    let description = article.fields.description ? article.fields.description : null;
    if(!description) {
        const firstParagraph = JSON.parse(article.fields.content).blocks.find((block) => block.type === 'paragraph');
        
        if(firstParagraph) {
            truncate.setup({
                stripTags: true,
                length: 100
            })
            description = truncate(firstParagraph.data.text);
        } else {
            description = null;
        }
    }
    return description;

}

export {
    normalizeListedLinks,
    normalizeListedArticles,
    getArticleDescription
}