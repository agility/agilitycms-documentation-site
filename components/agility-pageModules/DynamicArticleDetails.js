import React, { useEffect } from "react";
import ArticleNav from '../common/ArticleNav'
import Blocks from '../common/blocks/index'

const DynamicArticleDetails = ({ module, dynamicPageItem }) => {

  // get module fields
  const { fields } = module;
  const blocks = JSON.parse(dynamicPageItem.fields.content).blocks;

  //find the h2 headings to build an article nav
  const h2Blocks = blocks.filter((block, idx) => {
    return block.type === 'header' && block.data.level == 2;
  })

  return (
    <div id="DynamicArticleDetails" className="flex flex-row justify-center">
      <div className="relative px-8">
        <div className="text-lg max-w-prose mx-auto">
            <h1>
                <span className="mt-20 mb-8 block text-3xl text-center leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                    {dynamicPageItem.fields.title}
                </span>
            </h1>
            <Blocks blocks={blocks}/>
        </div>
        
      </div>
      <div className="hidden lg:block sticky top-0 w-60 flex-none max-h-96 py-12">
          <ArticleNav headings={h2Blocks} />
        </div>
    </div>
    
  );
};


export default DynamicArticleDetails;
