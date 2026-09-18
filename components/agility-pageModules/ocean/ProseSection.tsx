import React from "react";
import { renderHTML } from "../../../utils/htmlUtils";
import { renderPageSections } from "lib/docs/renderPageSections";

interface ProseSectionProps {
	module: {
		contentID?: number;
		fields: {
			body: string;
		};
	};
	/** Passed to every module by ContentZone; keys the shared heading pass. */
	page?: any;
}

/**
 * Long-form rich text, on the Ocean band.
 *
 * The distinction from the legacy `RichTextArea` matters: that one centres a
 * 672px column in the full viewport, which lands its left edge ~280px right of
 * every Ocean component's (they all share `ocean-band` + `max-w-[var(--wrap)]`).
 * On a page that mixes the two — /docs/ai — the prose visibly fails to line up
 * with the hero, code panels and callouts above and below it.
 *
 * So this sits in the same band and wrap as its siblings, and constrains the
 * *measure* instead of the container: the text starts on the shared left edge
 * and stops at ~72ch, which keeps long-form readable without indenting it.
 */
const ProseSection = ({ module: { fields, contentID }, page }: ProseSectionProps) => {
	// The body comes back from the page-wide pass with ids on its H2s, so the
	// on-this-page nav has something to link to. That pass is cached on `page`,
	// so this costs one shared computation per request, not one per section.
	// Falling back to the raw body keeps the module renderable on its own (no
	// `page`, or a zone this pass doesn't walk) — just without anchors.
	const html =
		renderPageSections(page).bodyByContentID.get(Number(contentID)) ??
		renderHTML(fields.body).__html;

	return (
		<section
			className="ocean-band px-[var(--space)] py-3"
			style={{ background: "var(--bg)" }}
			data-agility-component={contentID}
		>
			<div className="max-w-[var(--wrap)] mx-auto">
				<div
					className="prose max-w-[72ch]"
					data-agility-field="body"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</div>
		</section>
	);
};

export default ProseSection;
