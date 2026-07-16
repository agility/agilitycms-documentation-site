import "server-only";

import { getMainSiteContentItem } from "lib/cms/getMainSiteContent";

export interface FooterData {
	footerNavigation: { name: string; children: any[] }[];
	footerBottomNavigation: { name: string; href: string | null; target: string | null }[];
	footerCopyright: string;
}

/**
 * Footer nav from the main marketing instance (contentID 16, five columns +
 * bottom links + copyright). Cached under `main-site-content-16` (hours).
 */
export const getFooterData = async (): Promise<FooterData> => {
	const mainSiteFooter = await getMainSiteContentItem({
		contentID: 16,
		expandAllContentLinks: true,
	});

	const fields = mainSiteFooter?.fields || {};
	const footerNavigation: FooterData["footerNavigation"] = [];

	for (let col = 1; col <= 5; col++) {
		// Column 5 historically appears with either casing in the main instance.
		const title = fields[`column${col}Title`] ?? fields[`Column${col}Title`] ?? "";
		const links = fields[`column${col}Links`] ?? fields[`Column${col}Links`];
		if (!title && !links) continue;

		footerNavigation.push({
			name: title,
			children: (Array.isArray(links) ? links : [])
				.filter((link: any) => link?.fields)
				.map((link: any) => {
					const linkData: any = {
						name: link.fields.title,
						title: link.fields.title,
						href: link.fields.uRL?.href || null,
						target: link.fields.uRL?.target || null,
					};
					if (link.fields.header !== undefined) linkData.header = link.fields.header;
					return linkData;
				}),
		});
	}

	return {
		footerNavigation,
		footerBottomNavigation: (fields.bottomLinks || []).map((link: any) => ({
			name: link.fields.title,
			href: link.fields.uRL?.href || null,
			target: link.fields.uRL?.target || null,
		})),
		footerCopyright: fields.copyright || "© Copyright, Agility Inc.",
	};
};
