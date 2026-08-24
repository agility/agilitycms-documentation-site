import Link from "next/link";
import { getContentList } from "lib/cms/getContentList";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";

/*
  Previous / next article navigation (Stripe/Vercel docs pattern). Siblings
  are the articles in the same section, in itemOrder — resolved from the
  article's own container (dynamicPageItem.properties.referenceName) and the
  cached flat sitemap, so this revalidates with the publish webhook like
  everything else. Server component; renders nothing at section boundaries'
  missing side, or entirely when siblings can't be resolved.
*/
interface ArticlePrevNextProps {
	dynamicPageItem: any;
	sitemapNode: any;
	languageCode: string;
	isPreview?: boolean;
}

interface PagerItem {
	title: string;
	href: string;
}

const getSiblings = async ({ dynamicPageItem, sitemapNode, languageCode, isPreview }: ArticlePrevNextProps) => {
	try {
		const referenceName = dynamicPageItem?.properties?.referenceName;
		const sectionID = dynamicPageItem?.fields?.section?.contentID;
		if (!referenceName || !sectionID || !sitemapNode?.path) return null;

		const [list, sitemap] = await Promise.all([
			getContentList({
				referenceName,
				locale: languageCode,
				preview: !!isPreview,
				sort: "properties.itemOrder",
				contentLinkDepth: 1,
				take: 250,
			}),
			getSitemapFlat({ locale: languageCode, preview: !!isPreview }),
		]);

		const urlByContentID: Record<number, string> = {};
		Object.values(sitemap).forEach((node: any) => {
			if (node.contentID && node.contentID > 0) urlByContentID[node.contentID] = node.path;
		});

		// Depending on link depth, `section` is either an expanded item
		// ({contentID}) or a raw reference ({contentid: "n"}).
		const sectionOf = (item: any) =>
			item.fields?.section?.contentID ??
			parseInt(item.fields?.section?.contentid ?? "", 10);

		const siblings = (list?.items || [])
			.filter((item: any) => sectionOf(item) === sectionID)
			.map((item: any) => ({
				title: item.fields.title,
				href: urlByContentID[item.contentID],
			}))
			.filter((item: PagerItem) => item.title && item.href);

		const index = siblings.findIndex((item: PagerItem) => item.href === sitemapNode.path);
		if (index === -1) return null;

		return {
			prev: index > 0 ? siblings[index - 1] : null,
			next: index < siblings.length - 1 ? siblings[index + 1] : null,
		};
	} catch (error) {
		// Data-layer failures must never take down the article page.
		console.error("ArticlePrevNext: could not resolve siblings", error);
		return null;
	}
};

const ArticlePrevNext = async (props: ArticlePrevNextProps) => {
	const siblings = await getSiblings(props);
	if (!siblings || (!siblings.prev && !siblings.next)) return null;
	const { prev, next } = siblings;

	return (
		<nav
			aria-label="Article pagination"
			className="mx-auto mt-14 grid max-w-[75ch] grid-cols-1 gap-3 font-muli sm:grid-cols-2"
		>
			{prev ? <PagerCard item={prev} rel="prev" /> : <span className="hidden sm:block" />}
			{next && <PagerCard item={next} rel="next" />}
		</nav>
	);
};

const PagerCard = ({ item, rel }: { item: PagerItem; rel: "prev" | "next" }) => {
	const isNext = rel === "next";
	return (
		<Link
			href={item.href}
			rel={rel}
			className={`group block rounded-(--r-md) border border-(--border) bg-(--surface) px-5 py-4 transition-transform hover:-translate-y-0.5 hover:border-(--border-strong) ${
				isNext ? "text-right" : "text-left"
			}`}
		>
			<div className="font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
				{isNext ? "Next →" : "← Previous"}
			</div>
			<div className="mt-1 text-[.95rem] font-semibold text-(--text-2) group-hover:text-(--primary-text)">
				{item.title}
			</div>
		</Link>
	);
};

export default ArticlePrevNext;
