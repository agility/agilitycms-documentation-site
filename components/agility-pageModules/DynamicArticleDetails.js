import React, { useState } from "react";
import Blocks from "../common/blocks/index";
import axios from "axios";
import nextConfig from "next.config";

const DynamicArticleDetails = ({ module, dynamicPageItem, sitemapNode }) => {

  // get module fields
  const { fields } = module;
  const blocks = JSON.parse(dynamicPageItem.fields.content).blocks;


  return (
    <div
      id="DynamicArticleDetails"
      className="xl:flex xl:flex-row justify-center font-muli mb-32"
    >
      <div className="relative px-8">
        <div className="text-lg max-w-prose mx-auto">
          <h1>
            <span className="mt-20 mb-8 block text-3xl text-center leading-8 text-gray-900 md:text-4xl font-semibold">
              {dynamicPageItem.fields.title}
            </span>
          </h1>
          <Blocks blocks={blocks} />
        </div>
      </div>
    </div>
  );
};

export default DynamicArticleDetails;
