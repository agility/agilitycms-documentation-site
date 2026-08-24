"use client";

import { useEffect } from "react";
import { enhanceCodeTabs } from "components/common/codeTabs";

/**
 * The only browser-side work the markdown body needs.
 *
 * It deliberately takes a target id rather than wrapping the body: the body is
 * server-rendered with dangerouslySetInnerHTML, and passing that HTML string
 * through a client component would serialise the whole article a second time
 * into the RSC payload. This finds the already-rendered container instead, so
 * nothing about the body is duplicated or re-rendered on the client.
 *
 * Syntax highlighting is NOT here — it happens on the server in
 * lib/docs/renderArticleBody.ts.
 */
export const ArticleBodyEnhancer = ({ targetId }: { targetId: string }) => {
	useEffect(() => {
		const root = document.getElementById(targetId);
		if (!root) return;

		// Upgrade `.code-tabs` blocks to real tabs.
		enhanceCodeTabs(root);

		// Browsers do not execute <script> tags inserted via innerHTML. Re-create
		// each one so embedded JS in CMS markdown actually runs.
		root.querySelectorAll("script").forEach((oldScript) => {
			const newScript = document.createElement("script");
			for (const attr of Array.from(oldScript.attributes)) {
				newScript.setAttribute(attr.name, attr.value);
			}
			if (oldScript.textContent) newScript.textContent = oldScript.textContent;
			oldScript.parentNode?.replaceChild(newScript, oldScript);
		});
	}, [targetId]);

	return null;
};

export default ArticleBodyEnhancer;
