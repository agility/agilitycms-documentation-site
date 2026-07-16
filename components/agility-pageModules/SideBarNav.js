import { gql } from "lib/cms/gql";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";
import SideBarNavClient from "components/common/SideBarNavClient";

const getSectionBaseUrl = (the_url) => {
	var the_arr = the_url.split("/");
	the_arr.pop();
	return the_arr.join("/");
};

/**
 * Sidebar navigation (server component). Builds the category -> section ->
 * article tree from the Agility GraphQL API and resolves article URLs from
 * the flat sitemap (both cached with tags — see lib/cms). The interactive UI
 * lives in components/common/SideBarNavClient.
 */
const SideBarNav = async ({ module, dynamicPageItem, sitemapNode, languageCode, isPreview }) => {
	const navigation = [];
	const locale = languageCode;
	const preview = !!isPreview;

	//the category of sections/articles to show in the sidebar
	const category = module.fields.category;

	//top level item (category landing page)
	navigation.push({
		name: category.fields.title,
		href: !dynamicPageItem
			? sitemapNode.path
			: getSectionBaseUrl(sitemapNode.path),
		current: !dynamicPageItem ? true : false,
	});

	const sectionsRefName = category.fields.sections?.referencename;
	const articlesRefName = category.fields.articles?.referencename;

	if (!sectionsRefName || !articlesRefName) {
		console.log("No `sectionsRefName` or `articlesRefName` was found for this category");
		return <SideBarNavClient navigation={navigation} />;
	}

	// TODO: `take: 250` is the per-request max for the Agility GraphQL API. A category with
	// more than 250 articles (or 250 sections) will silently drop the overflow from the sidebar.
	// Add pagination (loop on `skip`/`take` until fewer than `take` rows return) when any
	// category approaches that limit. Developer is the largest today (~69 articles).
	const data = await gql({
		query: `
		{
			${articlesRefName} (take: 250, sort: "properties.itemOrder") {
				contentID
				fields {
					title
					section_ValueField
				}
			},
			${sectionsRefName} (take: 250, sort: "properties.itemOrder") {
				contentID
				fields {
					title
					parentSection_ValueField
				}
			}
		}
		`,
		locale,
		preview,
	});

	const sections = data[sectionsRefName];
	const articles = data[articlesRefName];

	if (!sections || !articles) {
		console.log("No `sections` or `articles` were found for this category");
		return <SideBarNavClient navigation={navigation} />;
	}

	//dictionary of dynamic page urls by contentID (from the cached flat sitemap)
	const sitemap = await getSitemapFlat({ locale, preview });
	const articleUrls = {};
	Object.values(sitemap).forEach((node) => {
		if (node.contentID && node.contentID > 0) {
			articleUrls[node.contentID] = node.path;
		}
	});

	//filter out the child sections
	const topLevelSections = sections.filter((section) => {
		return !section.fields.parentSection_ValueField;
	});

	//loop through top-level sections and add articles in
	topLevelSections.forEach((section) => {
		let articlesInSection = articles.filter((article) => {
			return article.fields.section_ValueField == section.contentID;
		});

		//don't show a section if it has no articles
		if (articlesInSection.length === 0) return;

		navigation.push({
			name: section.fields.title,
			children: articlesInSection.map((article) => {
				const url = articleUrls[article.contentID];
				return {
					name: article.fields.title || null,
					href: articleUrls[article.contentID] || "#",
					current: url === sitemapNode.path || null,
				};
			}),
		});
	});

	return <SideBarNavClient navigation={navigation} />;
};

export default SideBarNav;
