/**
 * Server-side article body rendering.
 *
 * This used to live inside DynamicArticleDetails, which was a `"use client"`
 * component — so the whole unified/remark/rehype pipeline AND highlight.js were
 * shipped to the browser and re-run during hydration, producing byte-identical
 * output to what the server had already rendered. On a large article (74KB body,
 * 10 code blocks) that pushed hydration to ~9s, during which nothing on the page
 * was interactive. Everything here now runs only on the server.
 *
 * `renderArticleBody` is wrapped in React `cache()` so the page template (which
 * needs the heading list for the on-this-page nav) and the article module (which
 * needs the HTML) share one computation per request instead of doing it twice.
 */
import { cache } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import hljs from "highlight.js";

export interface ArticleHeading {
	/** The anchor id — github-slugger's slug (markdown) or the EditorJS block id. */
	id: string;
	name: string;
}

export interface RenderedArticleBody {
	/** Processed markdown as HTML, already syntax-highlighted. Empty for the blocks path. */
	html: string;
	/** An H1 lifted out of the markdown body to be used as the page title. */
	h1Title: string | null;
	/** Parsed EditorJS blocks, or [] when the article is markdown. */
	blocks: any[];
	/** Top-level (H2) headings, in document order, for the on-this-page nav. */
	headings: ArticleHeading[];
}

/**
 * Auto-detection constrained to the languages our docs actually use. Unbounded
 * highlightAuto misfires badly — it classified a JSON response as Smalltalk,
 * turning every string into an italic "comment".
 */
const AUTO_SUBSET = [
	"json", "javascript", "typescript", "bash", "shell",
	"xml", "html", "css", "scss", "graphql", "yaml",
	"python", "csharp", "go", "php", "sql",
];

function remarkDisableIndentedCode(this: any) {
	const data = this.data();
	const list = data.micromarkExtensions || (data.micromarkExtensions = []);
	list.push({ disable: { null: ["codeIndented"] } });
}

/** Concatenate the text of a hast subtree. */
const textOf = (node: any): string => {
	if (node.type === "text") return node.value || "";
	if (!node.children) return "";
	return node.children.map(textOf).join("");
};

/**
 * Syntax-highlight `<pre><code>` in the hast tree, so the HTML the server emits
 * is already coloured and the browser has nothing to do. Runs after rehypeRaw so
 * author-written HTML has already become real elements; the `raw` nodes it
 * inserts survive to rehypeStringify because `allowDangerousHtml` is set.
 */
function rehypeHighlightCode() {
	return (tree: any) => {
		visit(tree, "element", (node: any, _index: any, parent: any) => {
			if (node.tagName !== "code" || !parent || parent.tagName !== "pre") return;

			const code = textOf(node);
			if (!code.trim()) return;

			const classes: string[] = ([] as string[]).concat(
				node.properties?.className || []
			);
			const languageClass = classes.find((c) => c.startsWith("language-"));
			const language = languageClass ? languageClass.replace("language-", "") : "";

			let value: string;
			try {
				value =
					language && hljs.getLanguage(language)
						? hljs.highlight(code, { language }).value
						: hljs.highlightAuto(code, AUTO_SUBSET).value;
			} catch {
				return; // leave the block as plain text rather than dropping it
			}

			node.children = [{ type: "raw", value }];
			node.properties = { ...node.properties, className: [...classes, "hljs"] };
			parent.properties = {
				...parent.properties,
				className: ([] as string[]).concat(parent.properties?.className || [], "hljs-pre"),
			};
		});
	};
}

/** Collect H2s (after rehypeSlug has assigned ids) for the on-this-page nav. */
function rehypeCollectHeadings(collected: ArticleHeading[]) {
	return (tree: any) => {
		visit(tree, "element", (node: any) => {
			if (node.tagName !== "h2") return;
			const id = node.properties?.id;
			const name = textOf(node).trim();
			if (id && name) collected.push({ id: String(id), name });
		});
	};
}

/** H2 headings from EditorJS blocks. Heading.tsx renders `<hN id={block.id}>`. */
const headingsFromBlocks = (blocks: any[]): ArticleHeading[] =>
	blocks
		.filter((b) => b?.type === "header" && Number(b?.data?.level) === 2)
		.map((b) => ({
			id: String(b.id || ""),
			// EditorJS heading text can contain inline markup (<b>, <i>, …).
			name: String(b.data?.text || "").replace(/<[^>]*>/g, "").trim(),
		}))
		.filter((h) => h.id && h.name);

/**
 * Build everything the article body and its nav need, once per request.
 *
 * `classic` selects the `classicContent` field instead of `content` — the two
 * are rendered as separate bodies so the Classic-UI toggle can switch between
 * them without any of this running in the browser.
 */
export const renderArticleBody = cache(
	(dynamicPageItem: any, classic = false): RenderedArticleBody => {
		const fields = dynamicPageItem?.fields || {};
		const blockContent = classic ? fields.classicContent : fields.content;

		let blocks: any[] = [];
		try {
			blocks = JSON.parse(blockContent || `{ "blocks": [] }`)?.blocks || [];
		} catch {
			blocks = [];
		}

		const markdownContent = fields.markdownContent;

		// Markdown is only used when there are no blocks — same rule as before.
		if (blocks.length > 0 || !markdownContent) {
			return { html: "", h1Title: null, blocks, headings: headingsFromBlocks(blocks) };
		}

		// Lift a leading H1 out of the body; it becomes the page title.
		const lines = markdownContent.split("\n");
		const firstLine = lines[0]?.trim() || "";
		let h1Title: string | null = null;
		let source = markdownContent;
		if (firstLine.startsWith("# ")) {
			h1Title = firstLine.substring(2).trim();
			source = lines.slice(1).join("\n");
		}

		const headings: ArticleHeading[] = [];
		let html = "";
		try {
			html = unified()
				.use(remarkParse)
				.use(remarkDisableIndentedCode)
				.use(remarkGfm)
				.use(remarkRehype, { allowDangerousHtml: true })
				.use(rehypeRaw)
				.use(rehypeSlug)
				.use(rehypeHighlightCode)
				.use(rehypeCollectHeadings, headings)
				.use(rehypeStringify, { allowDangerousHtml: true })
				.processSync(source)
				.toString();
		} catch (error) {
			console.error("Error processing markdown:", error);
			return { html: "", h1Title, blocks: [], headings: [] };
		}

		// A markdown body may open with an HTML <h1> rather than `# `; lift that too.
		if (!h1Title) {
			const match = html.match(/^<h1[^>]*>(.*?)<\/h1>\s*/i);
			if (match) {
				h1Title = match[1].replace(/<[^>]*>/g, "").trim();
				html = html.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, "");
			}
		} else {
			html = html.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, "");
		}

		return { html, h1Title, blocks: [], headings };
	}
);

/** The on-this-page headings for an article, whichever body field it uses. */
export const getArticleHeadings = (dynamicPageItem: any): ArticleHeading[] =>
	renderArticleBody(dynamicPageItem).headings;
