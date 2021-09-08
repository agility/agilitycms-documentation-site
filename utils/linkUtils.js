import { getDynamicPageSitemapMapping } from "./sitemapUtils";

const normalizeListedLinks = ({ listedLinks }) => {

    const articleUrls = getDynamicPageSitemapMapping();

    const list = listedLinks.map((item) => {
        const hasArticle = item.fields.article;
        
        if(hasArticle) {
            return {
                title: item.fields.article.fields.title,
                href: articleUrls[item.fields.article.contentID],
                description: item.fields.description ? item.fields.description : null,
                icon: item.fields.article.fields.concept ? item.fields.article.fields.concept.fields.icon : null
            }
        } else {
            return {
                title: item.fields.explicitURL.text,
                href: item.fields.explicitURL.href,
                description: item.fields.description ? item.fields.description : null,
                icon: item.fields.explicitIcon
            }
        }
    })

    return list;
}
export {
    normalizeListedLinks
}