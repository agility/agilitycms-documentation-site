import React from "react";
import hljs from "highlight.js";
import CopyCodeButton from "./CopyCodeButton";

interface CodeBlockProps {
	module: {
		contentID?: number;
		fields: {
			language: string;
			code: string;
			filename?: string;
			showCopy?: string | boolean;
		};
	};
}

// Ocean code panel (mockup .code): traffic-light dots, filename, copy button.
// A SERVER component — highlighting runs here, at render time, so the panel
// arrives coloured and highlight.js never reaches the browser. It used to
// highlight in a client effect, which shipped the whole library and redid work
// the server could have done once.
const CodeBlock = ({ module: { fields, contentID } }: CodeBlockProps) => {
	const showCopy = fields.showCopy === true || fields.showCopy === "true";

	let highlighted: string | null = null;
	if (fields.language && hljs.getLanguage(fields.language)) {
		try {
			highlighted = hljs.highlight(fields.code, { language: fields.language }).value;
		} catch {
			highlighted = null; // fall back to plain text
		}
	}

	return (
		<section className="ocean-band px-[var(--space)] py-3" style={{ background: "var(--bg)" }} data-agility-component={contentID}>
			<div
				className="max-w-[var(--wrap)] mx-auto overflow-hidden"
				style={{
					background: "var(--code-bg)",
					border: "1px solid var(--border)",
					borderRadius: "var(--r-md)",
					boxShadow: "var(--elev-1)",
				}}
			>
				<div
					className="flex items-center gap-2 px-3.5 py-2.5"
					style={{
						borderBottom: "1px solid var(--border)",
						fontFamily: "var(--mono)",
						fontSize: ".72rem",
						color: "var(--muted)",
					}}
				>
					<span className="w-[9px] h-[9px]" style={{ borderRadius: "var(--r-round)", background: "var(--err)" }} />
					<span className="w-[9px] h-[9px]" style={{ borderRadius: "var(--r-round)", background: "var(--tertiary)" }} />
					<span className="w-[9px] h-[9px]" style={{ borderRadius: "var(--r-round)", background: "var(--ok)" }} />
					<span className="ml-1.5">{fields.filename || fields.language}</span>
					{showCopy && <CopyCodeButton code={fields.code} />}
				</div>
				{/* Padding on the <code>, not the scrolling <pre>, so the horizontal
				    scrollbar sits flush to the panel edges. */}
				<pre className="m-0 overflow-x-auto">
					<code
						className={`language-${fields.language}${highlighted ? " hljs" : ""} block p-4`}
						style={{
							fontFamily: "var(--mono)",
							fontSize: ".82rem",
							color: "var(--text)",
							lineHeight: 1.75,
						}}
						data-agility-field="code"
						{...(highlighted
							? { dangerouslySetInnerHTML: { __html: highlighted } }
							: { children: fields.code })}
					/>
				</pre>
			</div>
		</section>
	);
};

export default CodeBlock;
