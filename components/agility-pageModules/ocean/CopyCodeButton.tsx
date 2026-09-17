"use client";

import React, { useState } from "react";

/**
 * The only interactive part of the Ocean code panel. Split out so CodeBlock
 * itself can be a server component — it used to be `"use client"` purely to run
 * highlight.js in an effect, which put the whole library in the client bundle
 * and re-highlighted code the server had already rendered.
 */
export const CopyCodeButton = ({ code }: { code: string }) => {
	const [copied, setCopied] = useState(false);

	const copy = () => {
		navigator.clipboard?.writeText(code).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		});
	};

	return (
		<button
			type="button"
			onClick={copy}
			className="ml-auto font-bold px-2 py-0.5 cursor-pointer"
			style={{
				fontFamily: "var(--font)",
				fontSize: ".7rem",
				color: "var(--muted)",
				background: "var(--raised)",
				border: "1px solid var(--border)",
				borderRadius: "var(--r-xs)",
			}}
		>
			{copied ? "Copied" : "Copy"}
		</button>
	);
};

export default CopyCodeButton;
