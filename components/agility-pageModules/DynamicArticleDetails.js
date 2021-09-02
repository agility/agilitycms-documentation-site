import React, { useEffect } from "react";
import { renderHTML } from "@agility/nextjs";
import ArticleNav from '../common/ArticleNav'

const DynamicArticleDetails = ({ module, dynamicPageItem }) => {
  // get module fields
  const { fields } = module;

  return (
    <div className="flex flex-row justify-center">
     
      <div className="relative px-8">
        <div className="max-w-2xl mx-auto my-12 md:mt-18 lg:mt-20">
          <div
            className="prose max-w-full mx-auto"
            dangerouslySetInnerHTML={renderHTML(dynamicPageItem.fields.title)}
          />
        </div>
        
      </div>
      <div className="hidden lg:block sticky top-0 w-60 flex-none max-h-96 py-12">
          <ArticleNav />
        </div>
    </div>
    
  );
};

export default DynamicArticleDetails;
