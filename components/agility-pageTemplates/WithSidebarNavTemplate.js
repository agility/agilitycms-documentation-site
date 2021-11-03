import React, { useEffect, useState } from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Footer from "../common/Footer";
import ArticleNav from "../common/ArticleNav";

const isArticle = (dynamicPageItem) => {
  return (
    dynamicPageItem &&
    dynamicPageItem.properties.definitionName === "DocArticle"
  );
};

const WithSidebarNavTemplate = (props) => {
  const hasArticle = isArticle(props.dynamicPageItem);

  return (
    <>
      <div id="WithSidebarNavTemplate" className="flex flex-grow bg-white">
        <div>
          <div className="hidden lg:flex lg:flex-shrink-0 overflow-y-auto sticky top-[128px]">
            <ContentZone
              name="SidebarContentZone"
              {...props}
              getModule={getModule}
            />
          </div>
        </div>

        <div
          id="ScrollContainer"
          className="flex-grow border-l border-gray-200 w-full lg:flex lg:justify-center"
        >
          <div id="ContentContainer">
            <ContentZone
              name="MainContentZone"
              {...props}
              getModule={getModule}
            />
          </div>
          {hasArticle && (
            <div className="mb-60">
              <div className="hidden xl:block sticky top-[200px] w-60 flex-none pt-4">
                <ArticleNav
                  dynamicPageItem={props.dynamicPageItem}
                  sitemapNode={props.sitemapNode}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer
        navigation={props.footerNavigation}
        bottomNavigation={props.footerBottomNavigation}
        pageTemplateName={props.pageTemplateName}
      />
    </>
  );
};

export default WithSidebarNavTemplate;
