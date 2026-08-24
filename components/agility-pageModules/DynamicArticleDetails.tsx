/**
 * The article body. A SERVER component — deliberately.
 *
 * It used to be `"use client"`, which dragged the whole render path into the
 * browser: unified/remark/rehype re-parsed the markdown and highlight.js
 * re-highlighted every code block during hydration, producing byte-identical
 * output to the server's. On a 74KB article with 10 code blocks that took ~9s,
 * and until it finished nothing on the page was interactive — including the
 * on-this-page nav, which is why it appeared so late.
 *
 * The three things that genuinely need the browser are now small, separate
 * client components: the Classic-UI toggle (ClassicModeSwitch), the code-tab
 * upgrade and inline-script re-execution (ArticleBodyEnhancer), and the
 * on-this-page scroll-spy (ArticleNav). Everything else renders once, on the
 * server. See lib/docs/renderArticleBody.ts.
 */
import React from "react";
import Blocks from "../common/blocks/index";
import LegacyNotice from "components/common/LegacyNotice";
import { getArchivedEntry } from "lib/docs/legacyFrameworks";
import { renderArticleBody } from "lib/docs/renderArticleBody";
import ArticleBodyEnhancer from "components/common/ArticleBodyEnhancer";
import ClassicModeSwitch from "./ClassicModeSwitch";

const MARKDOWN_BODY_ID = "ArticleMarkdownBody";

interface DynamicArticleDetailsProps {
	module: {
		fields: any;
	};
	// DocArticle content item — fields include title, description, content,
	// classicContent, markdownContent, section (loose CMS shape)
	dynamicPageItem: any;
	sitemapNode?: any;
}

/** The rendered body for one content field — markdown HTML or EditorJS blocks. */
const ArticleBody = ({ dynamicPageItem, classic }: { dynamicPageItem: any; classic?: boolean }) => {
	const { html, blocks } = renderArticleBody(dynamicPageItem, classic);

	if (blocks.length === 0 && html) {
		return (
			<>
				{/* Already syntax-highlighted on the server; React treats an
				    innerHTML subtree as opaque, so there is nothing to hydrate. */}
				<div
					id={MARKDOWN_BODY_ID}
					className="prose max-w-none"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
				<ArticleBodyEnhancer targetId={MARKDOWN_BODY_ID} />
			</>
		);
	}

	return <Blocks blocks={blocks} />;
};

const DynamicArticleDetails = ({ dynamicPageItem, sitemapNode }: DynamicArticleDetailsProps) => {
	const { h1Title } = renderArticleBody(dynamicPageItem);

	const showClassicMode = !!dynamicPageItem.fields.classicContent;
	const sectionTitle = dynamicPageItem.fields.section?.fields?.title;
	const lede = dynamicPageItem.fields.description;

	// Archived frameworks (e.g. Gatsby) get a Legacy banner above the body so a
	// reader who lands from a search result knows the guide is unmaintained.
	const archived = getArchivedEntry(sitemapNode?.path || "");

	// The body renders from one of two fields — tell Web Studio which one is
	// live so clicking the article body opens the right editor field.
	const { html, blocks } = renderArticleBody(dynamicPageItem);
	const bodyField = blocks.length === 0 && html ? "markdownContent" : "content";

	return (
		<div
			id="DynamicArticleDetails"
			className="font-muli mb-24"
			data-agility-component={dynamicPageItem.contentID}
		>
			<div className="w-full">
				{/* Prose fills the content column (bounded by the 1400px grid) for a
				    fuller reading experience — no fixed 75ch cap, no dead gutter. */}
				<div className="text-lg">
					{/* Ocean article header (mockup): eyebrow, left title, lede */}
					{sectionTitle && (
						<p className="mt-10 mb-3 font-mono text-[.72rem] uppercase tracking-[.24em] text-(--muted)">
							{sectionTitle}
						</p>
					)}
					<h1
						className={`${sectionTitle ? "mt-0" : "mt-10"} mb-4 font-(family-name:--serif) text-3xl md:text-4xl font-semibold leading-[1.1] tracking-tight text-(--text) text-balance`}
						// Only the CMS `title` field is editable in place — when the
						// heading comes from a markdown H1 it lives in the body field.
						data-agility-field={h1Title ? undefined : "title"}
					>
						{h1Title || dynamicPageItem.fields.title}
					</h1>
					{lede && (
						<p
							className="mb-10 max-w-[75ch] text-[1.08rem] leading-relaxed text-(--text-2)"
							data-agility-field="description"
						>
							{lede}
						</p>
					)}

					{archived && <LegacyNotice entry={archived} />}

					<div data-agility-field={bodyField}>
						{showClassicMode ? (
							<ClassicModeSwitch
								standard={<ArticleBody dynamicPageItem={dynamicPageItem} />}
								classic={<ArticleBody dynamicPageItem={dynamicPageItem} classic />}
							/>
						) : (
							<ArticleBody dynamicPageItem={dynamicPageItem} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DynamicArticleDetails;
