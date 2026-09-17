import React from "react";
import { renderHTML } from "../../../utils/htmlUtils";

interface ProseSectionProps {
	module: {
		contentID?: number;
		fields: {
			body: string;
		};
	};
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
const ProseSection = ({ module: { fields, contentID } }: ProseSectionProps) => (
	<section
		className="ocean-band px-[var(--space)] py-3"
		style={{ background: "var(--bg)" }}
		data-agility-component={contentID}
	>
		<div className="max-w-[var(--wrap)] mx-auto">
			<div
				className="prose max-w-[72ch]"
				data-agility-field="body"
				dangerouslySetInnerHTML={renderHTML(fields.body)}
			/>
		</div>
	</section>
);

export default ProseSection;
