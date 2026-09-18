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

/**
 * The `?format=auto&w=…` ladder, matching components/common/blocks/Image.tsx exactly.
 * Each step is gated on the image's real pixel width because **the image CDN upscales**:
 * measured on a 1280x720 source, `w=2000` returns a genuine 2000x1125 image. Emitting
 * every step unconditionally would ship upscaled bytes to large screens.
 */
const SRCSET_STEPS: { w: number; media: string }[] = [
	{ w: 2000, media: "(min-width: 1200px) and (min-resolution: 2x)" },
	{ w: 1600, media: "(min-width: 800px) and (min-resolution: 2x)" },
	{ w: 1200, media: "(min-width: 1200px)" },
	{ w: 800, media: "(min-width: 800px)" },
	{ w: 600, media: "(min-width: 600px)" },
];

/**
 * Give Markdown images the same treatment the EditorJS path has always had.
 *
 * Markdown had NO image handling: `![](url)` became a bare `<img>` serving the full
 * original (138 KB where the ladder sends 12-30 KB). That is a live bug for articles
 * already written in Markdown, and it would have become a regression for every article
 * migrated off the block editor.
 *
 * Width comes from the `width` attribute, which is why the EditorJS converter emits
 * `<img src width height alt>` rather than `![]()` -- Markdown's image syntax has
 * nowhere to put the pixel width, and without it the gate above cannot work. Absent a
 * width we fall back to 800, which is precisely what Image.tsx does.
 *
 * GIFs are passed through untouched: the image service does not support them.
 */
function rehypeImage() {
	return (tree: any) => {
		visit(tree, "element", (node: any, index: any, parent: any) => {
			if (node.tagName !== "img" || !parent || typeof index !== "number") return;
			if (parent.tagName === "picture") return; // already converted

			const src: string = String(node.properties?.src || "");
			if (!src || src.endsWith(".gif")) return;

			const width = Number(node.properties?.width) || 800;
			let url = src.replaceAll(" ", "%20");
			if (!url.includes("?format=auto")) url += "?format=auto";

			const sources = SRCSET_STEPS.filter((step) => width >= step.w).map((step) => ({
				type: "element",
				tagName: "source",
				properties: { srcSet: `${url}&w=${step.w}`, media: step.media },
				children: [],
			}));

			// The <img> stays as the final fallback, and keeps its alt text.
			const fallback = {
				...node,
				properties: { ...node.properties, src: `${url}&w=400`, loading: "lazy", decoding: "async" },
			};

			parent.children[index] = {
				type: "element",
				tagName: "picture",
				properties: {},
				children: [...sources, fallback],
			};
		});
	};
}

/**
 * GitHub alert types -> the token and glyph each one paints with.
 *
 * Deliberately the vocabulary of components/agility-pageModules/ocean/CalloutBlock.tsx,
 * which is the SOURCE of this look -- Warning.tsx, Info.tsx and LegacyNotice.tsx all
 * carry a comment saying they copy it. NOTE and WARNING reproduce CalloutBlock's `note`
 * and `caution` exactly (same token, same glyph); TIP, IMPORTANT and CAUTION extend it
 * onto --ok, --primary and --err, all of which are declared in both theme blocks of
 * tokens.css. Match CalloutBlock if it ever moves, not the downstream copies.
 */
const ALERTS: Record<string, { token: string; mark: string }> = {
	NOTE: { token: "--info", mark: "i" },
	TIP: { token: "--ok", mark: "\u2713" },
	IMPORTANT: { token: "--primary", mark: "\u2605" },
	WARNING: { token: "--warn", mark: "!" },
	CAUTION: { token: "--err", mark: "!" },
};

/**
 * GitHub-style callouts: a blockquote whose first line is `[!WARNING]`.
 *
 * remark-gfm does NOT implement these -- GitHub renders them, the spec does not -- so
 * without this plugin the marker renders as literal `[!WARNING]` text. Written inline
 * rather than adding a dependency, matching the other custom plugins in this file.
 *
 * Pure hast manipulation, like the plugins around it: no IO, no Date, no randomness.
 * That matters because `cacheComponents: true` is on and this module is synchronous and
 * React-`cache()`d -- anything async reached from here makes the route postpone and the
 * article body re-renders per request instead of serving static HTML.
 *
 * Structure follows CalloutBlock: a flex row, a filled glyph badge, then the content.
 * One deliberate divergence -- CalloutBlock forces everything into a single `<p>` with
 * an inline bold heading, because its body is one text field. An alert can legitimately
 * contain several paragraphs, a list or a code block, so the children are kept intact
 * in a body wrapper instead.
 */
function rehypeGithubAlerts() {
	return (tree: any) => {
		visit(tree, "element", (node: any) => {
			if (node.tagName !== "blockquote") return;

			const firstEl = (node.children || []).find((c: any) => c.type === "element");
			if (!firstEl || firstEl.tagName !== "p") return;

			const marker = textOf(firstEl).match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);
			if (!marker) return;

			const kind = marker[1];
			const { token, mark } = ALERTS[kind];

			// Strip the marker from the first text node, then drop the paragraph if that
			// emptied it -- the common case, where the marker sits on its own line.
			const firstText = firstEl.children?.find((c: any) => c.type === "text");
			if (firstText) firstText.value = firstText.value.replace(marker[0], "");
			if (!textOf(firstEl).trim() && !firstEl.children?.some((c: any) => c.type === "element")) {
				node.children = node.children.filter((c: any) => c !== firstEl);
			}

			const badge = {
				type: "element",
				tagName: "span",
				properties: {
					ariaHidden: "true",
					className: ["callout-mark"],
					style:
						`flex: none; display: grid; place-items: center; width: 1.5rem; height: 1.5rem; ` +
						`font-weight: 800; font-size: .875rem; border-radius: var(--r-sm); ` +
						`background: var(${token}); color: var(--on-color);`,
				},
				children: [{ type: "text", value: mark }],
			};

			const body = {
				type: "element",
				tagName: "div",
				properties: { className: ["callout-body"], style: "min-width: 0; font-size: .92rem;" },
				children: node.children,
			};

			node.tagName = "div";
			node.properties = {
				className: ["callout", `callout-${kind.toLowerCase()}`],
				dataAlert: kind.toLowerCase(),
				style:
					`display: flex; gap: .75rem; padding: .875rem 1rem; margin: 2rem 0; ` +
					`background: color-mix(in srgb, var(${token}) 10%, var(--surface)); ` +
					`border: 1px solid color-mix(in srgb, var(${token}) 40%, transparent); ` +
					`border-radius: var(--r-md);`,
			};
			node.children = [badge, body];
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
				.use(rehypeGithubAlerts)
				.use(rehypeImage)
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
