import React from "react";
import OceanLink from "./OceanLink";
import { getContentList } from "lib/cms/getContentList";

interface FeatureCardFields {
	heading: string;
	body: string;
	linkText?: string;
	linkURL?: { href: string; text?: string; target?: string };
	icon?: string;
	accent?: string;
	badge?: string;
}

interface FeatureCardGroupProps {
	module: {
		fields: {
			groupHeading?: string;
			layout?: string;
			// expanded array when expandAllContentLinks is on; {referencename} otherwise
			cards?:
				| { contentID: number; fields: FeatureCardFields }[]
				| { referencename: string };
		};
	};
	languageCode?: string;
	isPreview?: boolean;
}

const layoutCols: Record<string, string> = {
	"three-up": "md:grid-cols-3",
	"two-up": "md:grid-cols-2",
	grid: "md:grid-cols-2 xl:grid-cols-4",
};

// Flagship cards (mockup .tcard). The bar colour and ink colour are separate
// per-accent CSS classes (globals.css) so yellow never sits as text on light.
const FeatureCardGroup = async ({
	module: { fields },
	languageCode,
	isPreview,
}: FeatureCardGroupProps) => {
	const cards = Array.isArray(fields.cards)
		? fields.cards
		: await getNestedCards(fields.cards, languageCode, isPreview);
	const cols = layoutCols[fields.layout || "three-up"] || layoutCols["three-up"];

	if (cards.length === 0) return null;

	return (
		<section className="px-[var(--space)] py-4" style={{ background: "var(--bg)" }}>
			<div className="max-w-[var(--wrap)] mx-auto">
				{fields.groupHeading && (
					<h2
						className="m-0 mb-4"
						style={{
							fontFamily: "var(--serif)",
							fontSize: "clamp(1.4rem,2.6vw,1.85rem)",
							letterSpacing: "-.02em",
							color: "var(--text)",
						}}
					>
						{fields.groupHeading}
					</h2>
				)}
				<div className={`grid grid-cols-1 ${cols} gap-4`}>
					{cards.map((card) => {
						const accent = card.fields.accent || "primary";
						const inner = (
							<>
								<span
									aria-hidden="true"
									className="absolute top-0 left-0 right-0 h-[3px]"
									style={{ background: "var(--tcbar)" }}
								/>
								{card.fields.icon && (
									<span
										className="grid place-items-center w-[38px] h-[38px] mb-3.5 text-[19px]"
										style={{
											borderRadius: "var(--r-sm)",
											background:
												"color-mix(in srgb, var(--tcbar) 15%, transparent)",
											color: "var(--tcink)",
										}}
									>
										{card.fields.icon}
									</span>
								)}
								<h3
									className="m-0 mb-1.5 flex items-center gap-2"
									style={{
										fontFamily: "var(--serif)",
										fontSize: "1.12rem",
										letterSpacing: "-.01em",
										color: "var(--text)",
									}}
								>
									{card.fields.heading}
									{card.fields.badge && (
										<span
											className="uppercase font-extrabold px-1.5 py-0.5"
											style={{
												fontFamily: "var(--font)",
												fontSize: ".6rem",
												letterSpacing: ".06em",
												background: "var(--tertiary)",
												color: "var(--on-color)",
												borderRadius: "var(--r-round)",
											}}
										>
											{card.fields.badge}
										</span>
									)}
								</h3>
								<p
									className="m-0 mb-4"
									style={{
										color: "var(--text-2)",
										fontSize: ".9rem",
										lineHeight: 1.55,
									}}
								>
									{card.fields.body}
								</p>
								{card.fields.linkText && (
									<span
										className="mt-auto uppercase inline-flex items-center gap-1.5"
										style={{
											fontFamily: "var(--mono)",
											fontSize: ".76rem",
											letterSpacing: ".06em",
											fontWeight: 500,
											color: "var(--tcink)",
										}}
									>
										{card.fields.linkText} →
									</span>
								)}
							</>
						);

						const cardClass = `ocean-card-${accent} relative flex flex-col overflow-hidden p-6 pb-5 transition-transform hover:-translate-y-[3px]`;
						const cardStyle: React.CSSProperties = {
							background: "var(--surface)",
							borderRadius: "var(--r-md)",
							boxShadow: "var(--elev-1)",
						};

						return card.fields.linkURL?.href ? (
							<OceanLink
								key={card.contentID}
								url={card.fields.linkURL.href}
								target={card.fields.linkURL.target}
								className={cardClass}
								style={cardStyle}
							>
								{inner}
							</OceanLink>
						) : (
							<div key={card.contentID} className={cardClass} style={cardStyle}>
								{inner}
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

// The page is fetched with expandAllContentLinks: false, so nested lists come
// back as {referencename} — fetch the child items via the cached data layer.
const getNestedCards = async (
	cardsField: { referencename: string } | undefined,
	languageCode?: string,
	isPreview?: boolean
) => {
	const referenceName = cardsField?.referencename;
	if (!referenceName || !languageCode) return [];

	const children = await getContentList({
		referenceName,
		locale: languageCode,
		preview: !!isPreview,
		sort: "properties.itemOrder",
		contentLinkDepth: 1,
		take: 50,
	});
	return children?.items || [];
};

export default FeatureCardGroup;
