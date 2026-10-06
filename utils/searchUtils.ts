import { gqlFresh } from "lib/cms/gql";
import { defaultLocale } from "lib/i18n/config";
import { getArticleDescription } from './linkUtils';

const MAX_BODY_LENGTH = 5000;

const getArticleLabels = async ({ article, category }: { article: any; category?: any }) => {
    if(!category) {
        category = await getCategoryOfSection({sectionContentID: article.fields.section.contentID});
    }
    return {
        categoryLabel: category ? category.fields.title : 'Page',
        sectionLabel: article.fields.section ? article.fields.section.fields.title : null,
        conceptLabel: article.fields.concept ? article.fields.concept.fields.title : null,
    };
}

const normalizeArticle = async ({ article, category, url }: { article: any; category?: any; url: string }) => {
    const { categoryLabel, sectionLabel, conceptLabel } = await getArticleLabels({ article, category });

    let headings: string[] = [];
    let body = '';

    if(article.fields.markdownContent) {
        headings = getMarkdownHeadings(article.fields.markdownContent);
        body = cleanMarkdown(article.fields.markdownContent);
    } else if(article.fields.content) {
        try {
            const parsed = JSON.parse(article.fields.content);
            const blocks = parsed.blocks || [];
            headings = getBlockHeadings(blocks);
            body = blocksToPlainText(blocks);
        } catch(e) {
            // Invalid JSON in content field — skip body extraction
        }
    }

    if(body.length > MAX_BODY_LENGTH) {
        body = body.substring(0, MAX_BODY_LENGTH);
    }

    const object = {
        objectID: article.contentID,
        title: article.fields.title,
        description: getArticleDescription(article),
        headings,
        body,
        section: sectionLabel,
        concept: conceptLabel,
        url,
        category: categoryLabel,
        itemOrder: article.properties.itemOrder
    }

    return object;
}

const getCategoryOfSection = async ({sectionContentID}: {sectionContentID: number}) => {
    const data = await gqlFresh({
        locale: defaultLocale,
        query: `
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

    const category = data.doccategories.find((cat: any) => {
        if(cat.fields.sections) {
            return cat.fields.sections.find((section: any) => section.contentID === sectionContentID);
        }
    })

    return category;
}

/**
 * Convert HTML inline formatting to plain text.
 * Strips all tags, keeps only the text content.
 */
const htmlToPlainText = (html: string | null | undefined): string => {
    if(!html) return '';
    let text = html;
    // Strip all HTML tags
    text = text.replace(/<[^>]*>/g, '');
    // Decode common entities
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    return text.trim();
}

/**
 * Extract headings from EditorJS blocks
 */
const getBlockHeadings = (blocks: any[]): string[] => {
    const headings: string[] = [];
    blocks.forEach((block: any) => {
        if(block.type === 'header') {
            headings.push(htmlToPlainText(block.data.text));
        }
    });
    return headings;
}

/**
 * Format list items recursively into plain text
 */
const formatListItems = (items: any[]): string => {
    const lines: string[] = [];
    if(!items) return '';
    items.forEach((item: any) => {
        const text = typeof item === 'string' ? htmlToPlainText(item) : htmlToPlainText(item.content);
        if(text) lines.push(text);
        if(item.items && item.items.length > 0) {
            lines.push(formatListItems(item.items));
        }
    });
    return lines.filter(Boolean).join('\n');
}

/**
 * Convert EditorJS blocks to plain text for indexing
 */
const blocksToPlainText = (blocks: any[]): string => {
    const lines: string[] = [];
    for(const block of blocks) {
        switch(block.type) {
            case 'paragraph':
                lines.push(htmlToPlainText(block.data.text));
                break;
            case 'header':
                lines.push(htmlToPlainText(block.data.text));
                break;
            case 'list':
                lines.push(formatListItems(block.data.items));
                break;
            case 'table':
                if(block.data.content) {
                    for(const row of block.data.content) {
                        lines.push(row.map((cell: any) => htmlToPlainText(cell)).filter(Boolean).join(' | '));
                    }
                }
                break;
            case 'quote':
                if(block.data.text) lines.push(htmlToPlainText(block.data.text));
                break;
            case 'warning':
                if(block.data.title) lines.push(htmlToPlainText(block.data.title));
                if(block.data.message) lines.push(htmlToPlainText(block.data.message));
                break;
            case 'checklist':
                if(block.data.items) {
                    for(const item of block.data.items) {
                        lines.push(htmlToPlainText(item.text));
                    }
                }
                break;
            // Skip code blocks — noisy for search
        }
    }
    return lines.filter(Boolean).join('\n');
}

/**
 * Extract headings from markdown content
 */
const getMarkdownHeadings = (markdown: string): string[] => {
    const headings: string[] = [];
    const lines = markdown.split('\n');
    for(const line of lines) {
        const match = line.match(/^#{1,6}\s+(.+)$/);
        if(match) {
            headings.push(match[1].trim());
        }
    }
    return headings;
}

/**
 * Clean source markdown for indexing into plain text.
 * Strips all markdown syntax so Algolia snippets display cleanly.
 */
const cleanMarkdown = (markdown: string): string => {
    let text = markdown;
    // Remove fenced code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    // Remove inline code backticks but keep content
    text = text.replace(/`([^`]+)`/g, '$1');
    // Remove images (keep alt text)
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    // Remove link URLs but keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove bare URLs
    text = text.replace(/https?:\/\/[^\s)]+/g, '');
    // Remove <style> and <script> blocks including their contents
    text = text.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');
    // Remove heading markers
    text = text.replace(/^#{1,6}\s+/gm, '');
    // Remove bold/italic markers
    text = text.replace(/(\*{1,3}|_{1,3})([^*_]+)\1/g, '$2');
    // Remove blockquote markers
    text = text.replace(/^>\s?/gm, '');
    // Remove list markers
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');
    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '');
    // Collapse excessive blank lines but keep structure
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
}

/**
 * One search record per heading-level section of an article (the
 * `doc_site_sections` Algolia index and the Azure AI Search index). Measured on
 * these docs (evals/search), section records beat one-record-per-article
 * because a hit lands on the passage that answers the question, nothing past
 * MAX_BODY_LENGTH is silently dropped, and code blocks stay in: developer
 * answers are often code. `articleId` groups an article's sections so search
 * can return one result per page.
 */
type SectionRecord = {
    objectID: string;
    articleId: string;
    position: number;
    title: string;
    heading: string;
    description: string | null;
    body: string;
    section: string | null;
    concept: string | null;
    category: string;
    url: string;
    itemOrder: number;
};

const MAX_SECTION_LENGTH = 2400;
const SECTION_OVERLAP = 300;

const normalizeArticleSections = async ({ article, category, url }: { article: any; category?: any; url: string }): Promise<SectionRecord[]> => {
    const { categoryLabel, sectionLabel, conceptLabel } = await getArticleLabels({ article, category });
    const sections = splitSections(articleMarkdown(article));
    const base = {
        articleId: `${article.contentID}`,
        title: article.fields.title,
        description: getArticleDescription(article),
        section: sectionLabel,
        concept: conceptLabel,
        category: categoryLabel,
        url,
        itemOrder: article.properties.itemOrder,
    };
    // An article with no body still gets one record so its title is findable.
    if(!sections.length) sections.push({ heading: '', text: '' });
    return sections.map((s, position) => ({
        ...base,
        objectID: `${article.contentID}-${position}`,
        position,
        heading: s.heading,
        body: cleanSectionText(s.text),
    }));
}

/**
 * The article as Markdown: the Markdown field when set, else the EditorJS
 * blocks converted, with headers as ## headings and code blocks fenced.
 */
const articleMarkdown = (article: any): string => {
    if(article.fields.markdownContent) return article.fields.markdownContent;
    if(!article.fields.content) return '';
    let blocks: any[] = [];
    try {
        blocks = JSON.parse(article.fields.content).blocks || [];
    } catch(e) {
        return '';
    }
    const out: string[] = [];
    for(const block of blocks) {
        if(block.type === 'header') {
            out.push(`${'#'.repeat(Math.min(Math.max(block.data.level || 2, 2), 6))} ${htmlToPlainText(block.data.text)}`);
        } else if(block.type === 'code' && block.data?.code) {
            out.push('```\n' + block.data.code + '\n```');
        } else {
            const text = blocksToPlainText([block]);
            if(text) out.push(text);
        }
    }
    return out.join('\n\n');
}

/** Split Markdown at H2/H3 headings (never inside a code fence), then split long sections by paragraph with a little overlap. */
const splitSections = (markdown: string): { heading: string; text: string }[] => {
    const sections: { heading: string; text: string }[] = [];
    let heading = '';
    let buf: string[] = [];
    let inFence = false;
    const flush = () => {
        const text = buf.join('\n').trim();
        if(text) sections.push({ heading, text });
    };
    for(const line of markdown.split('\n')) {
        if(line.trim().startsWith('```')) inFence = !inFence;
        const match = !inFence && line.match(/^#{2,3}\s+(.+)$/);
        if(match) {
            flush();
            heading = match[1].trim();
            buf = [];
        } else if(!/^#\s/.test(line) || inFence) {
            buf.push(line);
        }
    }
    flush();
    return sections.flatMap((s) => splitLong(s.text).map((text) => ({ heading: s.heading, text })));
}

const splitLong = (text: string): string[] => {
    if(text.length <= MAX_SECTION_LENGTH) return [text];
    const parts: string[] = [];
    let cur = '';
    for(const para of text.split(/\n{2,}/)) {
        if(cur && cur.length + para.length + 2 > MAX_SECTION_LENGTH) {
            parts.push(cur);
            cur = cur.slice(-SECTION_OVERLAP) + '\n\n' + para;
        } else {
            cur = cur ? `${cur}\n\n${para}` : para;
        }
        while(cur.length > MAX_SECTION_LENGTH * 1.5) {
            parts.push(cur.slice(0, MAX_SECTION_LENGTH));
            cur = cur.slice(MAX_SECTION_LENGTH - SECTION_OVERLAP);
        }
    }
    if(cur.trim()) parts.push(cur);
    return parts;
}

/** cleanMarkdown, but code is kept as plain lines instead of removed. */
const cleanSectionText = (markdown: string): string =>
    cleanMarkdown(markdown.replace(/```[^\n]*\n([\s\S]*?)```/g, '$1'));

export {
    normalizeArticle,
    normalizeArticleSections,
    articleMarkdown,
    splitSections,
}

export type { SectionRecord }