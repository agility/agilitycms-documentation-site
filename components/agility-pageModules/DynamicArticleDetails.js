import React, { useEffect } from "react";
import ArticleNav from '../common/ArticleNav'
import Blocks from '../common/blocks/index'

const DynamicArticleDetails = ({ module, dynamicPageItem }) => {
  // get module fields
  const { fields } = module;

  return (
    <div className="flex flex-row justify-center">
     
      <div className="relative px-8">
        <div className="max-w-2xl mx-auto my-12 md:mt-18 lg:mt-20">
            <h1>
                <span className="mt-2 block text-3xl text-center leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                    {dynamicPageItem.fields.title}
                </span>
            </h1>
            <Blocks blocks={JSON.parse(dynamicPageItem.fields.content).blocks}/>
        </div>
        
      </div>
      <div className="hidden lg:block sticky top-0 w-60 flex-none max-h-96 py-12">
          <ArticleNav />
        </div>
    </div>
    
  );
};

export default DynamicArticleDetails;
