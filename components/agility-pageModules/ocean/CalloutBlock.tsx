import React from "react";

interface CalloutBlockProps {
	module: {
		contentID?: number;
		fields: {
			heading?: string;
			body: string;
			style?: string;
		};
	};
}

// note -> info, control -> primary, caution -> warn (handoff §4)
const styleToken: Record<string, string> = {
	note: "--info",
	control: "--primary",
	caution: "--warn",
};

const styleMark: Record<string, string> = {
	note: "i",
	control: "✓",
	caution: "!",
};

// Ocean callout (mockup .alert)
const CalloutBlock = ({ module: { fields, contentID } }: CalloutBlockProps) => {
	const token = styleToken[fields.style || "note"] || "--info";
	const mark = styleMark[fields.style || "note"] || "i";

	return (
		<section className="ocean-band px-[var(--space)] py-3" style={{ background: "var(--bg)" }} data-agility-component={contentID}>
			<div
				className="max-w-[var(--wrap)] mx-auto flex gap-3 px-4 py-3.5"
				style={{
					background: `color-mix(in srgb, var(${token}) 10%, var(--surface))`,
					border: `1px solid color-mix(in srgb, var(${token}) 40%, transparent)`,
					borderRadius: "var(--r-md)",
				}}
			>
				<span
					aria-hidden="true"
					className="flex-none grid place-items-center w-6 h-6 font-extrabold text-sm"
					style={{
						borderRadius: "var(--r-sm)",
						background: `var(${token})`,
						// --on-primary flips white/near-black by theme; --on-color is
						// near-black in both and measured 3.08-3.67:1 on these light
						// fills (AA needs 4.5). Same swap as the Markdown alerts.
						color: "var(--on-primary)",
					}}
				>
					{mark}
				</span>
				<p className="m-0" style={{ fontSize: ".92rem", color: "var(--text-2)" }} data-agility-field="body">
					{fields.heading && (
						<b className="font-extrabold" style={{ color: "var(--text)" }} data-agility-field="heading">
							{fields.heading}{" "}
						</b>
					)}
					{fields.body}
				</p>
			</div>
		</section>
	);
};

export default CalloutBlock;
