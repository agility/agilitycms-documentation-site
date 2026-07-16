import React from "react";

interface CalloutBlockProps {
	module: {
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
const CalloutBlock = ({ module: { fields } }: CalloutBlockProps) => {
	const token = styleToken[fields.style || "note"] || "--info";
	const mark = styleMark[fields.style || "note"] || "i";

	return (
		<section className="px-[var(--space)] py-3" style={{ background: "var(--bg)" }}>
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
						color: "var(--on-color)",
					}}
				>
					{mark}
				</span>
				<p className="m-0" style={{ fontSize: ".92rem", color: "var(--text-2)" }}>
					{fields.heading && (
						<b className="font-extrabold" style={{ color: "var(--text)" }}>
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
