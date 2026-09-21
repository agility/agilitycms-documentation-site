import React from "react";

import { HttpMethod } from "lib/api-specs/types";

/**
 * The HTTP verb chip. Colours come from the semantic ocean tokens rather than
 * the usual REST-doc palette so the reference sits inside the docs design
 * system instead of next to it: reads are the brand teal, writes are blue,
 * destructive is the error red.
 *
 * `--on-primary` (not `--on-color`) is what labels on a `--primary` fill take —
 * it flips near-black/white by theme, which `--on-color` does not.
 */
const METHOD_STYLE: Record<HttpMethod, { background: string; color: string }> = {
	get: { background: "var(--primary)", color: "var(--on-primary)" },
	post: { background: "var(--secondary)", color: "var(--on-color)" },
	put: { background: "var(--tertiary)", color: "var(--on-color)" },
	patch: { background: "var(--tertiary)", color: "var(--on-color)" },
	delete: { background: "var(--err)", color: "var(--on-color)" },
};

interface Props {
	method: HttpMethod;
	className?: string;
}

const MethodBadge = ({ method, className = "" }: Props) => (
	<span
		className={`inline-flex shrink-0 items-center justify-center px-2 py-0.5 font-semibold uppercase tracking-wide ${className}`}
		style={{
			...METHOD_STYLE[method],
			borderRadius: "var(--r-xs)",
			fontFamily: "var(--mono)",
			fontSize: ".68rem",
			lineHeight: 1.5,
			minWidth: "3.4rem",
		}}
	>
		{method}
	</span>
);

export default MethodBadge;
