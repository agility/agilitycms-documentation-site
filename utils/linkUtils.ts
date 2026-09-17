import truncate from 'truncate-html'
import { getHrefTarget, getHrefRel } from "./hrefUtils";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";
import { defaultLocale } from "lib/i18n/config";

// Dynamic-page URLs by contentID, from the cached flat sitemap (tagged, so
// the revalidate webhook keeps it fresh). Replaces the old Apollo-cache trick.
const getArticleUrls = async ({ locale, preview }: { locale?: string; preview?: boolean }): Promise<Record<number, string>> => {
    const sitemap = await getSitemapFlat({ locale: locale || defaultLocale, preview: !!preview });
    const articleUrls: Record<number, string> = {};
    Object.values(sitemap).forEach((node: any) => {
        if (node.contentID && node.contentID > 0) {
            articleUrls[node.contentID] = node.path;
        }
    });
    return articleUrls;
}

const normalizeListedLinks = async ({ listedLinks, locale, preview }: { listedLinks: any[]; locale?: string; preview?: boolean }) => {

    const articleUrls = await getArticleUrls({ locale, preview });

    const list = listedLinks
        .filter((item: any) => item.fields.article || item.fields.explicitURL)
        .map((item: any) => {
            const article = item.fields.article;

            if (article) {
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

const normalizeListedArticles = async ({ listedArticles, locale, preview }: { listedArticles: any[]; locale?: string; preview?: boolean }) => {
    const articleUrls = await getArticleUrls({ locale, preview });

    const list = listedArticles.map((item: any) => {
        const article = item.fields.article;
        if (article) {
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

const getArticleDescription = (article: any): string | null => {
    let description: string | null = article.fields.description ? article.fields.description : null;
    if (!description && article.fields.markdownContent) {
        // Markdown article: extract first non-empty, non-heading line
        const lines = article.fields.markdownContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('---') && !trimmed.startsWith('```')) {
                // Strip markdown formatting
                const plain = trimmed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/(\*{1,3}|_{1,3})([^*_]+)\1/g, '$2').replace(/<[^>]*>/g, '');
                truncate.setup({ stripTags: true, length: 100 });
                description = truncate(plain);
                break;
            }
        }
    } else if (!description && article.fields.content) {
        // Block editor article
        try {
            const firstParagraph = JSON.parse(article.fields.content).blocks.find((block: any) => block.type === 'paragraph');
            if (firstParagraph) {
                truncate.setup({
                    stripTags: true,
                    length: 100
                })
                description = truncate(firstParagraph.data.text);
            }
        } catch(e) {
            description = null;
        }
    }
    return description;
}

export {
    normalizeListedLinks,
    normalizeListedArticles,
    getArticleDescription,
    getHrefTarget,
    getHrefRel
}