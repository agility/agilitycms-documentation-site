import React from "react";

interface MediaHeroProps {
	module: {
		fields: {
			heading: string;
			introText?: string;
			mediaAsset?: { url: string; label?: string };
			posterImage?: { url: string; label?: string };
			caption?: string;
		};
	};
}

// Hero with a demo capture. Captures go stale when the UI changes — note the
// dependent UI in the PR when adding one (handoff gotcha).
const MediaHero = ({ module: { fields } }: MediaHeroProps) => {
	return (
		<section
			className="ocean-band px-[var(--space)] pt-10 pb-8"
			style={{ background: "var(--bg)", color: "var(--text)" }}
		>
			<div className="max-w-[var(--wrap)] mx-auto">
				<h1
					className="m-0 mb-4"
					style={{
						fontFamily: "var(--serif)",
						fontSize: "clamp(2.1rem,4.6vw,3.1rem)",
						letterSpacing: "-.03em",
						lineHeight: 1.04,
						textWrap: "balance",
					}}
				>
					{fields.heading}
				</h1>
				{fields.introText && (
					<p
						className="m-0 mb-8 max-w-[62ch]"
						style={{
							color: "var(--text-2)",
							fontSize: "clamp(1rem,1.6vw,1.16rem)",
							lineHeight: 1.55,
						}}
					>
						{fields.introText}
					</p>
				)}
				{fields.mediaAsset?.url ? (
					<figure className="m-0">
						<video
							src={fields.mediaAsset.url}
							poster={fields.posterImage?.url}
							controls
							playsInline
							className="w-full"
							style={{ borderRadius: "var(--r-md)", boxShadow: "var(--elev-3)" }}
						/>
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
				) : (
					fields.posterImage?.url && (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={fields.posterImage.url}
							alt={fields.posterImage.label || ""}
							className="w-full"
							style={{ borderRadius: "var(--r-md)", boxShadow: "var(--elev-3)" }}
						/>
					)
				)}
			</div>
		</section>
	);
};

export default MediaHero;
