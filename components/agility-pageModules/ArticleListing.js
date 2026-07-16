import { normalizeListedArticles } from "utils/linkUtils";
import Link from "next/link";
import { getContentList } from "lib/cms/getContentList";

// Server component: fetches its own listed articles (was getCustomInitialProps).
const ArticleListing = async ({ module, languageCode, isPreview }) => {
  const { fields } = module;
  const articles = await getListedArticles({ fields, languageCode, isPreview });
  return (
    <div className="relative my-20 px-4 sm:px-6 lg:px-8 font-muli">
      <div className="absolute inset-0">
        <div className="bg-(--bg) h-1/3 sm:h-2/3" />
      </div>
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl tracking-normal font-medium text-(--text) sm:text-4xl">
            {fields.title}
          </h2>
        </div>
        <div className="mt-12 mx-auto grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {articles.map((article, index) => (
            <Link key={article.title} href={article.href} className={`flex flex-col overflow-hidden border border-(--border) group hover:border-(--primary) transition duration-150 ease-in-out`}
            >
              <div className="flex-1 bg-(--surface) p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <span className="block mt-2">
                    <p className="text-xl font-semibold text-(--text) group-hover:text-(--primary)">
                      {article.title}
                    </p>
                    <p className="mt-3 text-base text-(--text-2)">
                      {article.description}
                    </p>
                  </span>
                </div>
                {article.concept && (
                  <div className="mt-6 flex items-center">
                    <span className="bg-(--raised) text-(--text-2) group-hover:text-(--primary) inline-flex items-center px-3 py-0.5 rounded-xs text-sm font-normal">
                      {article.concept}
                    </span>
                  </div>
                )}
              </div>

            </Link>
          ))}
        </div>
      </div>
    </div >
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
