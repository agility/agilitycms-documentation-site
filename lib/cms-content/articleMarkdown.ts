import "server-only";

/**
 * Serialize a DocArticle to clean markdown for the machine-readability
 * endpoints (/{article-path}.md and llms.txt — rebuild plan T7).
 *
 * Articles store content one of two ways (same logic as
 * DynamicArticleDetails and utils/searchUtils):
 *  - fields.markdownContent — source markdown, served nearly verbatim
 *  - fields.content — EditorJS blocks JSON, converted block-by-block
 */

interface ArticleFields {
	title?: string;
	markdownContent?: string;
	content?: string;
	[key: string]: any;
}

export const articleToMarkdown = ({
	fields,
	canonicalUrl,
}: {
	fields: ArticleFields;
	canonicalUrl: string;
}): string => {
	const lines: string[] = [];

	const { body, h1 } = getArticleBody(fields);
	lines.push(`# ${h1 || fields.title || "Untitled"}`);
	lines.push("");
	lines.push(`> Source: ${canonicalUrl}`);
	lines.push("");
	lines.push(body.trim());
	lines.push("");

	return lines.join("\n");
};

/** Body markdown + the H1 (stripped from the body when the source leads with one). */
const getArticleBody = (fields: ArticleFields): { body: string; h1: string | null } => {
	const blockObj = safeParse(fields.content);
	const blocks: any[] = blockObj?.blocks || [];

	if (blocks.length === 0 && fields.markdownContent) {
		// Same H1 handling as the article renderer: a leading "# " line is the
		// title, not part of the body.
		const md = fields.markdownContent;
		const newline = md.indexOf("\n");
		const firstLine = (newline === -1 ? md : md.slice(0, newline)).trim();
		if (firstLine.startsWith("# ")) {
			return {
				h1: firstLine.slice(2).trim(),
				body: newline === -1 ? "" : md.slice(newline + 1),
			};
		}
		return { h1: null, body: md };
	}

	return { h1: null, body: blocksToMarkdown(blocks) };
};

const safeParse = (json?: string): any => {
	if (!json) return null;
	try {
		return JSON.parse(json);
	} catch {
		return null;
	}
};

/** Convert EditorJS blocks to markdown (block types per components/common/blocks). */
export const blocksToMarkdown = (blocks: any[]): string => {
	const out: string[] = [];

	for (const block of blocks) {
		const data = block.data || {};
		switch (block.type) {
			case "paragraph":
				out.push(inlineHtmlToMarkdown(data.text || ""));
				break;
			case "header": {
				const level = Math.min(Math.max(data.level || 2, 1), 6);
				out.push(`${"#".repeat(level)} ${inlineHtmlToMarkdown(data.text || "")}`);
				break;
			}
			case "list":
				out.push(listToMarkdown(data.items || [], data.style === "ordered", 0));
				break;
			case "checklist":
				out.push(
					(data.items || [])
						.map((item: any) => `- [${item.checked ? "x" : " "}] ${inlineHtmlToMarkdown(item.text || "")}`)
						.join("\n")
				);
				break;
			case "code":
				out.push("```\n" + (data.code || "") + "\n```");
				break;
			case "table": {
				const rows: string[][] = (data.content || []).map((row: string[]) =>
					row.map((cell) => inlineHtmlToMarkdown(cell).replace(/\|/g, "\\|"))
				);
				if (rows.length > 0) {
					const header = rows[0];
					const table = [
						`| ${header.join(" | ")} |`,
						`| ${header.map(() => "---").join(" | ")} |`,
						...rows.slice(1).map((row) => `| ${row.join(" | ")} |`),
					];
					out.push(table.join("\n"));
				}
				break;
			}
			case "quote":
				out.push(`> ${inlineHtmlToMarkdown(data.text || "")}`);
				break;
			case "warning":
			case "info": {
				const title = data.title ? `**${inlineHtmlToMarkdown(data.title)}**` : "";
				const message = inlineHtmlToMarkdown(data.message || "");
				out.push(`> ${[title, message].filter(Boolean).join(" — ")}`);
				break;
			}
			case "image": {
				const url = data.file?.url || "";
				if (url) out.push(`![${data.caption || ""}](${url})`);
				break;
			}
			case "delimiter":
				out.push("---");
				break;
			case "embed":
				out.push(data.source || data.embed || "");
				break;
			case "raw":
				out.push(data.html || "");
				break;
			default:
				if (data.text) out.push(inlineHtmlToMarkdown(data.text));
				break;
		}
	}

	return out.filter(Boolean).join("\n\n");
};

const listToMarkdown = (items: any[], ordered: boolean, depth: number): string => {
	const indent = "  ".repeat(depth);
	return items
		.map((item: any, idx: number) => {
			// EditorJS list items are {content, items} in current versions,
			// plain strings in older content.
			const text = typeof item === "string" ? item : item.content || "";
			const marker = ordered ? `${idx + 1}.` : "-";
			const line = `${indent}${marker} ${inlineHtmlToMarkdown(text)}`;
			const children = typeof item === "object" && item.items?.length ? "\n" + listToMarkdown(item.items, ordered, depth + 1) : "";
			return line + children;
		})
		.join("\n");
};

/** Convert EditorJS inline HTML (b/i/a/code/mark/br) to markdown; strip the rest. */
export const inlineHtmlToMarkdown = (html: string): string => {
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/gi, "**$1**")
		.replace(/<(?:i|em)>([\s\S]*?)<\/(?:i|em)>/gi, "*$1*")
		.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
		.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
		.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, "$1")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
};
