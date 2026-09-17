import React from "react";

interface ThemeAwareImageProps {
	module: {
		fields: {
			lightAsset: { url: string; label?: string };
			darkAsset?: { url: string; label?: string };
			altText: string;
			caption?: string;
		};
	};
}

// Screenshot/diagram that swaps with the theme. The .ocean-show-light /
// .ocean-show-dark visibility rules live in globals.css (driven by the .dark class).
// If no dark asset exists, the light asset is shown in both themes.
const ThemeAwareImage = ({ module: { fields } }: ThemeAwareImageProps) => {
	const hasDark = !!fields.darkAsset?.url;

	return (
		<section className="ocean-band px-[var(--space)] py-3" style={{ background: "var(--bg)" }}>
			<figure className="max-w-[var(--wrap)] mx-auto m-0">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={fields.lightAsset?.url}
					alt={fields.altText}
					className={`max-w-full ${hasDark ? "ocean-show-light" : ""}`}
					style={{ borderRadius: "var(--r-md)", boxShadow: "var(--elev-2)" }}
				/>
				{fields.darkAsset?.url && (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={fields.darkAsset.url}
						alt={fields.altText}
						className="max-w-full ocean-show-dark"
						style={{ borderRadius: "var(--r-md)", boxShadow: "var(--elev-2)" }}
					/>
				)}
				{fields.caption && (
					<figcaption
						className="mt-3"
						style={{
							fontFamily: "var(--mono)",
							fontSize: ".74rem",
							color: "var(--muted)",
						}}
					>
						{fields.caption}
					</figcaption>
				)}
			</figure>
		</section>
	);
};

export default ThemeAwareImage;
