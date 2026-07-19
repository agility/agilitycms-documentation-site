import { normalizeListedArticles } from "utils/linkUtils";
import { getContentList } from "lib/cms/getContentList";
import { SectionBand, LinkCardGrid } from "../common/ocean/SectionBand";

// Server component: fetches its own listed articles (was getCustomInitialProps).
// Renders through the shared ocean SectionBand; the article's concept shows
// as the card's mono category chip.
const ArticleListing = async ({ module, languageCode, isPreview }) => {
  const { fields } = module;
  const articles = await getListedArticles({ fields, languageCode, isPreview });

  const items = articles.map((article) => ({
    title: article.title,
    description: article.description,
    href: article.href,
    category: article.concept,
  }));

  return (
    <SectionBand heading={fields.title}>
      <LinkCardGrid items={items} columns={3} />
    </SectionBand>
  );
};

const getListedArticles = async ({ fields, languageCode, isPreview }) => {
  if (!fields.listedArticles?.referencename) return [];

  const children = await getContentList({
    referenceName: fields.listedArticles.referencename,
    locale: languageCode,
    preview: !!isPreview,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
    take: 50,
  });

  return await normalizeListedArticles({
    listedArticles: children.items || [],
    locale: languageCode,
    preview: !!isPreview,
  });
};

export default ArticleListing;
