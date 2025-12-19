import { client } from '../../agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageSitemapMapping } from '../../utils/sitemapUtils';
import SideBarNavClient from './SideBarNav.client';

const getSectionBaseUrl = (the_url: string) => {
	const the_arr = the_url.split("/");
	the_arr.pop();
	return the_arr.join("/");
};

interface Props {
	module: any;
	dynamicPageItem?: any;
	sitemapNode?: any;
	languageCode?: string;
}

export default async function SideBarNav({ module, dynamicPageItem, sitemapNode, languageCode }: Props) {
	const navigation: any[] = [];
	const category = module.fields.category;

	// Build navigation structure (original getCustomInitialProps logic)
	navigation.push({
		name: category.fields.title,
		href: !dynamicPageItem
			? sitemapNode.path
			: getSectionBaseUrl(sitemapNode.path),
		current: !dynamicPageItem ? true : false,
	});

	const sectionsRefName = category.fields.sections.referencename;
	const articlesRefName = category.fields.articles.referencename;

	if (!sectionsRefName || !articlesRefName) {
		return <SideBarNavClient module={module} dynamicPageItem={dynamicPageItem} navigation={navigation} />;
	}

	// Fetch sections and articles from GraphQL
	const { data } = await client.query({
		query: gql`
			{
				${articlesRefName} (sort: "properties.itemOrder") {
					contentID
					fields {
						title
						section_ValueField
					}
				},
				${sectionsRefName} (sort: "properties.itemOrder") {
					contentID
					fields {
						title
						parentSection_ValueField
					}
				}
			}
		`,
	});

	const articleUrls = getDynamicPageSitemapMapping();
	const articles = data[articlesRefName] || [];
	const sections = data[sectionsRefName] || [];

	// Build hierarchical navigation structure
	const sectionsMap = new Map();
	sections.forEach((section: any) => {
		sectionsMap.set(section.contentID, {
			name: section.fields.title,
			href: articleUrls[section.contentID] || '#',
			current: false,
			children: []
		});
	});

	// Add articles to their parent sections
	articles.forEach((article: any) => {
		const sectionId = article.fields.section_ValueField;
		const articleUrl = articleUrls[article.contentID] || '#';
		const isCurrent = dynamicPageItem?.contentID === article.contentID;

		if (sectionsMap.has(sectionId)) {
			sectionsMap.get(sectionId).children.push({
				name: article.fields.title,
				href: articleUrl,
				current: isCurrent
			});
		}
	});

	// Convert map to array and add to navigation
	const sectionsArray = Array.from(sectionsMap.values());
	navigation.push(...sectionsArray);

	// Mark parent section as current if any child is current
	sectionsArray.forEach((section) => {
		if (section.children.some((child: any) => child.current)) {
			section.current = true;
		}
	});

	return <SideBarNavClient module={module} dynamicPageItem={dynamicPageItem} navigation={navigation} />;
}
