import React, { useMemo, useState, useEffect } from "react";
import Blocks from "../common/blocks/index";
import axios from "axios";
import nextConfig from "next.config";
import { ToggleSwitch } from "components/common/ToggleSwitch";
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
const hljs = require('highlight.js');

function remarkDisableIndentedCode() {
	const data = this.data();
	const list = data.micromarkExtensions || (data.micromarkExtensions = []);
	list.push({ disable: { null: ['codeIndented'] } });
}

// Custom component to render markdown with code highlighting
const MarkdownContent = ({ htmlContent }) => {
	const containerRef = React.useRef(null);

	useEffect(() => {
		if (!containerRef.current) return;

		// Find all code blocks and apply syntax highlighting
		const codeBlocks = containerRef.current.querySelectorAll('pre code');
		codeBlocks.forEach((codeBlock) => {
			// Get language from class name (e.g., "language-javascript")
			const languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
			const language = languageClass ? languageClass.replace('language-', '') : '';

			// Apply highlight.js syntax highlighting
			if (language && hljs.getLanguage(language)) {
				try {
					const highlighted = hljs.highlight(codeBlock.textContent, { language });
					codeBlock.innerHTML = highlighted.value;
					codeBlock.classList.add('hljs');
				} catch (err) {
					console.error('Error highlighting code:', err);
				}
			} else {
				// Auto-detect language if not specified
				try {
					const highlighted = hljs.highlightAuto(codeBlock.textContent);
					codeBlock.innerHTML = highlighted.value;
					codeBlock.classList.add('hljs');
				} catch (err) {
					console.error('Error auto-detecting code language:', err);
				}
			}

			// Add appropriate styling classes to parent pre element
			const pre = codeBlock.parentElement;
			if (pre && pre.tagName === 'PRE') {
				pre.classList.add('hljs-pre');
			}
		});

		// Browsers do not execute <script> tags inserted via innerHTML.
		// Re-create each script element so embedded JS in CMS markdown actually runs.
		const inertScripts = containerRef.current.querySelectorAll('script');
		inertScripts.forEach((oldScript) => {
			const newScript = document.createElement('script');
			for (const attr of oldScript.attributes) {
				newScript.setAttribute(attr.name, attr.value);
			}
			if (oldScript.textContent) {
				newScript.textContent = oldScript.textContent;
			}
			oldScript.parentNode.replaceChild(newScript, oldScript);
		});
	}, [htmlContent]);

	return (
		<div
			ref={containerRef}
			className="prose prose-lg max-w-none"
			dangerouslySetInnerHTML={{ __html: htmlContent }}
		/>
	);
};

const DynamicArticleDetails = ({ module, dynamicPageItem, sitemapNode }) => {

	// get module fields
	const { fields } = module;

	const [classicMode, setClassicMode] = useState(false);
	const [processedMarkdown, setProcessedMarkdown] = useState('');
	const [markdownH1Title, setMarkdownH1Title] = useState(null);

	const showClassicMode = useMemo(() => !!dynamicPageItem.fields.classicContent, [dynamicPageItem.fields.classicContent])
	const markdownContent = useMemo(() => dynamicPageItem.fields.markdownContent, [dynamicPageItem.fields.markdownContent])


	const blockContent = classicMode && showClassicMode ?
		dynamicPageItem.fields.classicContent :
		dynamicPageItem.fields.content

	const blockObj = JSON.parse(blockContent || `{ "blocks": [] }`);

	const blocks = blockObj?.blocks || [];

	// Process markdown content when there are no blocks and markdown content exists
	useEffect(() => {
		if (blocks.length === 0 && markdownContent) {
			// Check if the first line of markdown is an h1
			const lines = markdownContent.split('\n');
			const firstLine = lines[0]?.trim() || '';
			let h1Text = null;
			let markdownWithoutH1 = markdownContent;

			// Check if first line is a markdown h1 (starts with # followed by space)
			if (firstLine.startsWith('# ')) {
				h1Text = firstLine.substring(2).trim();
				// Remove the first line (h1) from markdown
				markdownWithoutH1 = lines.slice(1).join('\n');
			}

			unified()
				.use(remarkParse)
				.use(remarkDisableIndentedCode)
				.use(remarkGfm)
				.use(remarkRehype, { allowDangerousHtml: true })
				.use(rehypeRaw)
				.use(rehypeSlug)
				.use(rehypeStringify, { allowDangerousHtml: true })
				.process(markdownWithoutH1)
				.then((processedContent) => {
					let htmlContent = processedContent.toString();

					// If we didn't find an h1 in markdown syntax, check the processed HTML
					// for an h1 tag at the beginning (in case markdown had HTML h1 tag)
					if (!h1Text) {
						const h1Match = htmlContent.match(/^<h1[^>]*>(.*?)<\/h1>\s*/i);
						if (h1Match) {
							// Extract text content from h1 (strip HTML tags if any)
							h1Text = h1Match[1].replace(/<[^>]*>/g, '').trim();
							// Remove the h1 from the HTML
							htmlContent = htmlContent.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, '');
						}
					} else {
						// If we found an h1 in markdown, also remove it from the processed HTML
						// in case it wasn't caught by the first line check
						htmlContent = htmlContent.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, '');
					}

					setProcessedMarkdown(htmlContent);
					setMarkdownH1Title(h1Text);
				})
				.catch((error) => {
					console.error('Error processing markdown:', error);
					setProcessedMarkdown('');
					setMarkdownH1Title(null);
				});
		} else {
			setProcessedMarkdown('');
			setMarkdownH1Title(null);
		}
	}, [blocks.length, markdownContent]);


	return (
		<div
			id="DynamicArticleDetails"
			className="xl:flex xl:flex-row justify-center font-muli mb-32"
		>

			<div className="relative px-8 xl:px-12 w-full">
				<div className="text-lg max-w-prose lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
					<div className="flex justify-end gap-2 mt-5">
						{showClassicMode &&
							<ToggleSwitch
								label="Classic UI Version"
								checked={classicMode}
								setChecked={(checked) => setClassicMode(checked)}
							/>
						}
					</div>
					<h1>
						<span className="mt-16 mb-8 block text-3xl text-center leading-8 text-gray-900 md:text-4xl font-semibold">
							{markdownH1Title || dynamicPageItem.fields.title}
						</span>
					</h1>

					{/* Render markdown content if no blocks exist and markdown content is available */}
					{blocks.length === 0 && processedMarkdown ? (
						<MarkdownContent htmlContent={processedMarkdown} />
					) : (
						<Blocks blocks={blocks} />
					)}
				</div>
			</div>
		</div>
	);
};

export default DynamicArticleDetails;
