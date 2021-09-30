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
                icon: article.fields.concept ? article.fields.concept.fields.icon : null,
                target: '_self',
                rel: null
            }
        } else {
            return {
                title: item.fields.explicitURL?.text,
                href: item.fields.explicitURL?.href,
                description: item.fields.description ? item.fields.description : null,
                icon: item.fields.explicitIcon ? item.fields.explicitIcon : null,
                target: getHrefTarget(item.fields.explicitURL?.href),
                rel: getHrefRel(item.fields.explicitURL?.href)
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

const getHrefTarget = (href) => {
    if(href && href.indexOf('://') > 0 || href.indexOf("//") === 0) {
        return '_blank';
    }
    return '_self';
}

const getHrefRel = (href) => {
    if(getHrefTarget(href) === '_blank') {
        return 'noopener';
    }
    return null;
}

export {
    normalizeListedLinks,
    normalizeListedArticles,
    getArticleDescription,
    getHrefTarget,
    getHrefRel
}