import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Footer from "../common/Footer";
import ArticleNav from "../common/ArticleNav";
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
        <div
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
                <ArticleNav
                  dynamicPageItem={props.dynamicPageItem}
                  sitemapNode={props.sitemapNode}
                />
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
