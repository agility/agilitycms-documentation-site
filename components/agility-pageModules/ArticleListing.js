import { normalizeListedArticles } from "utils/linkUtils";
import Link from "next/link";

const ArticleListing = ({ module, customData }) => {
  const { articles } = customData;
  const { fields } = module;
  return (
    <div className="relative my-20 px-4 sm:px-6 lg:px-8 font-muli">
      <div className="absolute inset-0">
        <div className="bg-white h-1/3 sm:h-2/3" />
      </div>
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl tracking-normal font-medium text-gray-900 sm:text-4xl">
            {fields.title}
          </h2>
        </div>
        <div className="mt-12 mx-auto grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {articles.map((article, index) => (
            <Link key={article.title} href={article.href} className={`flex flex-col overflow-hidden border border-lightGray group hover:border-brightPurple transition duration-150 ease-in-out`}
            >
              <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <span className="block mt-2">
                    <p className="text-xl font-semibold text-darkerGray group-hover:text-brightPurple">
                      {article.title}
                    </p>
                    <p className="mt-3 text-base text-darkGray">
                      {article.description}
                    </p>
                  </span>
                </div>
                {article.concept && (
                  <div className="mt-6 flex items-center">
                    <span className="bg-gray-100 text-darkerGray group-hover:text-brightPurple inline-flex items-center px-3 py-0.5 rounded-sm text-sm font-normal">
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

ArticleListing.getCustomInitialProps = async ({
  agility,
  channelName,
  languageCode,
  item,
  dynamicPageItem,
  sitemapNode,
}) => {
  const children = await agility.getContentList({
    referenceName: item.fields.listedArticles.referencename,
    languageCode,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  const articles = normalizeListedArticles({
    listedArticles: children.items,
  });

  return {
    articles,
  };
};

export default ArticleListing;
