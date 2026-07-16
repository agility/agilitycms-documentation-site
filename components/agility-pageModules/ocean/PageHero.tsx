import React from "react";

interface PageHeroProps {
	module: {
		fields: {
			heading: string;
			introText?: string;
			theme?: string;
			eyebrow?: string;
			media?: { url: string; label?: string };
		};
	};
}

// Ocean hero — eyebrow, balanced H1, lede (mockup: .eyebrow / h1 / .lede)
const PageHero = ({ module: { fields } }: PageHeroProps) => {
	return (
		<section
			className="px-[var(--space)] pt-10 pb-2"
			style={{ background: "var(--bg)", color: "var(--text)" }}
		>
			<div className="max-w-[var(--wrap)] mx-auto">
				{fields.eyebrow && (
					<p
						className="uppercase m-0 mb-3.5"
						style={{
							fontFamily: "var(--mono)",
							fontSize: ".72rem",
							letterSpacing: ".24em",
							color: "var(--muted)",
						}}
					>
						{fields.eyebrow}
					</p>
				)}
				<h1
					className="m-0 mb-4"
					style={{
						fontFamily: "var(--serif)",
						fontSize: "clamp(2.1rem,4.6vw,3.1rem)",
						letterSpacing: "-.03em",
						lineHeight: 1.04,
						textWrap: "balance",
						color: "var(--text)",
					}}
				>
					{fields.heading}
				</h1>
				{fields.introText && (
					<p
						className="m-0 mb-10 max-w-[62ch]"
						style={{
							color: "var(--text-2)",
							fontSize: "clamp(1rem,1.6vw,1.16rem)",
							lineHeight: 1.55,
						}}
					>
						{fields.introText}
					</p>
				)}
				{fields.media?.url && (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={fields.media.url}
						alt={fields.media.label || ""}
						className="max-w-full mb-8"
						style={{ borderRadius: "var(--r-md)", boxShadow: "var(--elev-2)" }}
					/>
				)}
			</div>
		</section>
	);
};

export default PageHero;
