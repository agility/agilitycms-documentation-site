import "server-only";

import { gql } from "lib/cms/gql";

export interface FooterLink {
	text: string;
	href: string;
	target?: string;
}

export interface FooterColumn {
	heading: string;
	links: FooterLink[];
}

export interface FooterData {
	tagline?: string;
	columns: FooterColumn[];
	legal: FooterLink[];
}

const FOOTER_QUERY = `
{
	footer {
		fields {
			tagline
			column1Name
			column1Links(sort: "properties.itemOrder") { fields { link { text href target } } }
			column2Name
			column2Links(sort: "properties.itemOrder") { fields { link { text href target } } }
			column3Name
			column3Links(sort: "properties.itemOrder") { fields { link { text href target } } }
			privacyLink { text href target }
			termsLink { text href target }
		}
	}
}`;

/**
 * Footer content from the docs instance's single `Footer` item (container 209):
 * tagline, three named link columns (nested Link lists), and the legal links.
 * Returns null when the item isn't available (e.g. not yet published) so the
 * component can fall back to its built-in defaults.
 */
export const getFooterData = async ({
	locale,
	preview,
}: {
	locale: string;
	preview: boolean;
}): Promise<FooterData | null> => {
	try {
		const result = await gql<{ footer: any[] }>({
			query: FOOTER_QUERY,
			locale,
			preview,
		});
		const fields = result.footer?.[0]?.fields;
		if (!fields) return null;

		const mapLinks = (items: any[]): FooterLink[] =>
			(items || [])
				.map((item) => item?.fields?.link)
				.filter((link) => link?.href && link?.text);

		const columns = [
			{ heading: fields.column1Name, links: mapLinks(fields.column1Links) },
			{ heading: fields.column2Name, links: mapLinks(fields.column2Links) },
			{ heading: fields.column3Name, links: mapLinks(fields.column3Links) },
		].filter((col) => col.heading && col.links.length);

		if (!columns.length) return null;

		return {
			tagline: fields.tagline || "",
			columns,
			legal: [fields.privacyLink, fields.termsLink].filter(
				(link) => link?.href && link?.text
			),
		};
	} catch (error) {
		// A footer fetch problem should never take down the page.
		console.error("getFooterData failed", error);
		return null;
	}
};
