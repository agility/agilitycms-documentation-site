import React from "react";
import OceanLink from "./OceanLink";
import { getContentList } from "lib/cms/getContentList";

interface LinkCardFields {
	heading: string;
	body?: string;
	linkURL?: { href: string; text?: string; target?: string };
	category?: string;
}

interface ArticleListSectionProps {
	module: {
		fields: {
			sectionHeading: string;
			sectionIntro?: string;
			// expanded array when expandAllContentLinks is on; {referencename} otherwise
			items?:
				| { contentID: number; fields: LinkCardFields }[]
				| { referencename: string };
		};
	};
	languageCode?: string;
	isPreview?: boolean;
}

// Section heading + intro + link cards (mockup .sec-title + guide links)
const ArticleListSection = async ({
	module: { fields },
	languageCode,
	isPreview,
}: ArticleListSectionProps) => {
	const items = Array.isArray(fields.items)
		? fields.items
		: await getNestedItems(fields.items, languageCode, isPreview);

	return (
		<section className="ocean-band px-[var(--space)] py-6" style={{ background: "var(--bg)" }}>
			<div className="max-w-[var(--wrap)] mx-auto">
				<h2
					className="m-0 mb-2"
					style={{
						fontFamily: "var(--serif)",
						fontSize: "clamp(1.4rem,2.6vw,1.85rem)",
						letterSpacing: "-.02em",
						color: "var(--text)",
					}}
				>
					{fields.sectionHeading}
				</h2>
				{fields.sectionIntro && (
					<p
						className="m-0 mb-5 max-w-[68ch]"
						style={{ color: "var(--text-2)", lineHeight: 1.6 }}
					>
						{fields.sectionIntro}
					</p>
				)}
				{items.length > 0 && (
					<ul className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-2 gap-3">
						{items.map((item) => (
							<li key={item.contentID}>
								<OceanLink
									url={item.fields.linkURL?.href || "#"}
									target={item.fields.linkURL?.target}
									className="block h-full p-4 transition-transform hover:-translate-y-0.5"
									style={{
										background: "var(--surface)",
										borderRadius: "var(--r-md)",
										boxShadow: "var(--elev-1)",
									}}
								>
									<span
										className="block font-bold"
										style={{ color: "var(--primary)" }}
									>
										{item.fields.heading}
									</span>
									{item.fields.body && (
										<span
											className="block mt-1"
											style={{
												color: "var(--text-2)",
												fontSize: ".9rem",
												lineHeight: 1.5,
											}}
										>
											{item.fields.body}
										</span>
									)}
									{item.fields.category && (
										<span
											className="inline-block mt-2 uppercase"
											style={{
												fontFamily: "var(--mono)",
												fontSize: ".66rem",
												letterSpacing: ".14em",
												color: "var(--faint)",
											}}
										>
											{item.fields.category}
										</span>
									)}
								</OceanLink>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
};

// The page is fetched with expandAllContentLinks: false, so nested lists come
// back as {referencename} — fetch the child items via the cached data layer.
const getNestedItems = async (
	itemsField: { referencename: string } | undefined,
	languageCode?: string,
	isPreview?: boolean
) => {
	const referenceName = itemsField?.referencename;
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

export default ArticleListSection;
