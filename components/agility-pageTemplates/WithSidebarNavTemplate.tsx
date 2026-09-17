import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Footer from "../common/Footer";
import ArticleNav from "../common/ArticleNav";
import { getArticleHeadings } from "lib/docs/renderArticleBody";
import ArticlePrevNext from "../common/ArticlePrevNext";

const isArticle = (dynamicPageItem: any) => {
  return (
    dynamicPageItem &&
    dynamicPageItem.properties.definitionName === "DocArticle"
  );
};

// Ocean docs shell (mockup .shell): sidebar / measured content / TOC rail on
// a single max-width grid — whitespace separates the columns, not borders.
// props: the full Agility page props (page, sitemapNode, dynamicPageItem,
// languageCode, isPreview, ...) spread through to ContentZone — loose CMS shape.
const WithSidebarNavTemplate = (props: any) => {
  const hasArticle = isArticle(props.dynamicPageItem);

  return (
    <>
      <div id="WithSidebarNavTemplate" className="grow bg-(--bg) text-(--text)">
        {/* data-article-scope marks the boundary ArticleNav collects headings
            within. It must stay on the element that wraps BOTH the article body
            and the nav: during an App Router client transition the outgoing page
            is still mounted, so a document-wide `#DynamicArticleDetails h2`
            query sees two articles at once and merges their headings. */}
        <div
          data-article-scope=""
          className={`mx-auto grid max-w-[1400px] grid-cols-1 gap-x-11 px-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:px-6 ${
            hasArticle ? "xl:grid-cols-[248px_minmax(0,1fr)_220px]" : ""
          }`}
        >
          <div>
            <ContentZone
              name="SidebarContentZone"
              {...props}
              getModule={getModule}
            />
          </div>

          <div id="ScrollContainer" className="min-w-0 pb-20 pt-2 lg:pt-4">
            <div id="ContentContainer">
              <ContentZone
                name="MainContentZone"
                {...props}
                getModule={getModule}
              />
            </div>
            {hasArticle && (
              <ArticlePrevNext
                dynamicPageItem={props.dynamicPageItem}
                sitemapNode={props.sitemapNode}
                languageCode={props.languageCode}
                isPreview={props.isPreview}
              />
            )}
          </div>

          {hasArticle && (
            <div className="hidden xl:block">
              <div className="sticky top-[60px] pt-12">
                {/* Headings come from the server render of the body (shared
                    with the article module via React cache(), so the markdown
                    pipeline runs once per request) — the nav is therefore in
                    the SSR HTML and does not wait on hydration. */}
                <ArticleNav headings={getArticleHeadings(props.dynamicPageItem)} />
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer languageCode={props.languageCode} isPreview={props.isPreview} />
    </>
  );
};

export default WithSidebarNavTemplate;
