import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { getArticleDescription } from './linkUtils';

const MAX_BODY_LENGTH = 5000;

const normalizeArticle = async ({ article, category, url }) => {
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

    let headings = [];
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

/**
 * Convert HTML inline formatting to plain text.
 * Strips all tags, keeps only the text content.
 */
const htmlToPlainText = (html) => {
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
const getBlockHeadings = (blocks) => {
    const headings = [];
    blocks.forEach((block) => {
        if(block.type === 'header') {
            headings.push(htmlToPlainText(block.data.text));
        }
    });
    return headings;
}

/**
 * Format list items recursively into plain text
 */
const formatListItems = (items) => {
    const lines = [];
    if(!items) return '';
    items.forEach((item) => {
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
const blocksToPlainText = (blocks) => {
    const lines = [];
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
                        lines.push(row.map(cell => htmlToPlainText(cell)).filter(Boolean).join(' | '));
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
const getMarkdownHeadings = (markdown) => {
    const headings = [];
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
const cleanMarkdown = (markdown) => {
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

export {
    normalizeArticle
}