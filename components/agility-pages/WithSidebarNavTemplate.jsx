'use client'

import React, { useEffect, useState } from "react";

import { getModule } from "components/agility-components";
import Footer from "../common/Footer";
import ArticleNav from "../common/ArticleNav";
import { ContentZone } from "components/ContentZone";

const isArticle = (dynamicPageItem) => {
  return (
    dynamicPageItem &&
    dynamicPageItem.properties.definitionName === "DocArticle"
  );
};

const WithSidebarNavTemplate = (props) => {

  console.log("WithSidebarNavTemplate props:", props);


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

        {/* Mobile sidebar - rendered by SideBarNav component */}
        <div className="lg:hidden">
          <ContentZone
            name="SidebarContentZone"
            {...props}
            getModule={getModule}
          />
        </div>

        <div
          id="ScrollContainer"
          className="flex-grow w-full border-l border-gray-200 lg:flex lg:justify-center"
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

    </>
  );
};

export default WithSidebarNavTemplate;
