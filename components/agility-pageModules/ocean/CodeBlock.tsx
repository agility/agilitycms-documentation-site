"use client";

import React, { useEffect, useRef, useState } from "react";
const hljs = require("highlight.js");

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
// Highlighting is a client-side enhancement; the code text itself is SSR'd.
const CodeBlock = ({ module: { fields, contentID } }: CodeBlockProps) => {
	const codeRef = useRef<HTMLElement>(null);
	const [copied, setCopied] = useState(false);
	const showCopy = fields.showCopy === true || fields.showCopy === "true";

	useEffect(() => {
		if (!codeRef.current) return;
		if (fields.language && hljs.getLanguage(fields.language)) {
			try {
				const highlighted = hljs.highlight(fields.code, {
					language: fields.language,
				});
				codeRef.current.innerHTML = highlighted.value;
			} catch (e) {
				// leave plain text in place
			}
		}
	}, [fields.code, fields.language]);

	const copy = () => {
		navigator.clipboard?.writeText(fields.code).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		});
	};

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
					{showCopy && (
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
					)}
				</div>
				<pre className="m-0 p-4 overflow-x-auto">
					<code
						ref={codeRef}
						className={`language-${fields.language}`}
						style={{
							fontFamily: "var(--mono)",
							fontSize: ".82rem",
							color: "var(--text)",
							lineHeight: 1.75,
						}}
						data-agility-field="code"
					>
						{fields.code}
					</code>
				</pre>
			</div>
		</section>
	);
};

export default CodeBlock;
