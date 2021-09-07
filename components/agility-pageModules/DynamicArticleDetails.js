import React, { useState } from "react";
import ArticleNav from '../common/ArticleNav'
import Blocks from '../common/blocks/index'
import { ThumbUpIcon, ThumbDownIcon } from "@heroicons/react/outline";
import SubmitNegativeFeedback from '../common/SubmitNegativeFeedback'
import axios from 'axios'

const DynamicArticleDetails = ({ module, dynamicPageItem, sitemapNode }) => {

  const [positiveFeedbackSubmitted, setPositiveFeedbackSubmitted] = useState(false);
  const [negativeFeedbackSubmitted, setNegativeFeedbackSubmitted] = useState(false);
  const [negativeFeedbackClicked, setNegativeFeedbackClicked] = useState(false);
  const url = sitemapNode.path;

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
      
      <div className="hidden lg:block sticky top-0 w-60 flex-none max-h-96 pt-20">
        <ArticleNav headings={h2Blocks} />
        <hr className="mt-5 mb-5"/>
        {!positiveFeedbackSubmitted && !negativeFeedbackSubmitted &&
        <div>
          <div className="text-center text-gray-600">Was this article helpful?</div>
          <div className="flex flex-row mt-2 justify-center">
            <button className="w-8 mx-2 text-gray-600 hover:text-gray-900" title="😊 Yes, helpful!" onClick={() => sendPositiveFeedback({url, title: dynamicPageItem.fields.title, setPositiveFeedbackSubmitted})}>
              <ThumbUpIcon  />
            </button>
            <button className="w-8 mx-2 text-gray-600 hover:text-gray-900" title="Submit Feedback" onClick={() => setNegativeFeedbackClicked(true)}>
              <ThumbDownIcon  />
            </button>
          </div>
        </div>
        }
        {(positiveFeedbackSubmitted || negativeFeedbackSubmitted) &&
          <div>
            <div className="text-center text-gray-600">Thank you for your feedback!</div>
          </div>
        }
        {negativeFeedbackClicked &&
          <SubmitNegativeFeedback url={url} title={dynamicPageItem.fields.title} setNegativeFeedbackClicked={setNegativeFeedbackClicked} setNegativeFeedbackSubmitted={setNegativeFeedbackSubmitted} />
        }
      </div>
      
    </div>
    
  );
};

const sendPositiveFeedback = ({url, title, setPositiveFeedbackSubmitted}) => {
  
  //fire and forget
  axios.post(`/api/feedback/sendPositive`, {
    url,
    title
  })

  setPositiveFeedbackSubmitted(true);
}



export default DynamicArticleDetails;
