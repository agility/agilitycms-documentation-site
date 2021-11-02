/* This example requires Tailwind CSS v2.0+ */
import { useEffect, useState } from "react";
import axios from "axios";
import nextConfig from "next.config";
import { ThumbUpIcon, ThumbDownIcon } from "@heroicons/react/outline";
import SubmitNegativeFeedback from "../common/SubmitNegativeFeedback";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ArticleNav({ dynamicPageItem, sitemapNode }) {

  const [positiveFeedbackSubmitted, setPositiveFeedbackSubmitted] =
    useState(false);
  const [negativeFeedbackSubmitted, setNegativeFeedbackSubmitted] =
    useState(false);
  const [negativeFeedbackClicked, setNegativeFeedbackClicked] = useState(false);
  const url = `${nextConfig.basePath}${sitemapNode.path}`;

  const blocks = JSON.parse(dynamicPageItem.fields.content).blocks;

  //find the h2 headings to build an article nav
  const headings = blocks.filter((block, idx) => {
    return block.type === "header" && block.data.level == 2;
  });

  //set up the Article Nav sync for the reader
  useEffect(() => {
    const $articleNav = document.getElementById("ArticleNav");

    //if we don't have an article nav or scroll container, return and don't do anything
    if (!$articleNav) return;
    
    const $articleNavHeaders = $articleNav.children;
    const $articleHeaders = document.querySelectorAll(
      "#DynamicArticleDetails h2"
    );

    //run on load...
    syncArticleNav({
      $articleNav,
      $articleHeaders,
      $articleNavHeaders,
    });

    //run again when we scroll
    window.onscroll = () => {
      syncArticleNav({
        $articleNav,
        $articleHeaders,
        $articleNavHeaders,
      });
    };

    return () => (window.onscroll = null);
  }, [blocks]);

  const navigation = [];
  headings.map((heading, idx) => {
    navigation.push({
      name: heading.data.text,
      href: `#${heading.id}`,
      current: false, //property not being used, classes are applied manually using DOM manipulation -- see `syncArticleNav`
    });
  });

  return (
    <div>
      <div>In this Article:</div>
      <nav id="ArticleNav" className="space-y-1" aria-label="Article Nav">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={classNames(
              item.current
                ? "bg-lightGray text-darkestGray"
                : "text-darkGray hover:text-purple",
              "flex items-center px-3 py-2 text-sm font-medium"
            )}
            aria-current={item.current ? "page" : undefined}
          >
            <span className="truncate">{item.name}</span>
          </a>
        ))}
      </nav>
        <hr className="mt-5 mb-5" />
        {!positiveFeedbackSubmitted && !negativeFeedbackSubmitted && (
          <div>
            <div className="text-center text-darkGray">
              Was this article helpful?
            </div>
            <div className="flex flex-row mt-2 justify-center space-x-4">
              <button
                className="text-gray-600 hover:text-brightPurple bg-lightGray p-3 rounded-full"
                title="😊 Yes, helpful!"
                onClick={() =>
                  sendPositiveFeedback({
                    url,
                    title: dynamicPageItem.fields.title,
                    setPositiveFeedbackSubmitted,
                  })
                }
              >
                <ThumbUpIcon className="w-6 h-6" />
              </button>
              <button
                className="text-gray-600 hover:text-brightPurple bg-lightGray p-3 rounded-full"
                title="Submit Feedback"
                onClick={() => setNegativeFeedbackClicked(true)}
              >
                <ThumbDownIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
        {(positiveFeedbackSubmitted || negativeFeedbackSubmitted) && (
          <div>
            <div className="text-center text-gray-600">
              Thank you for your feedback!
            </div>
          </div>
        )}
        {negativeFeedbackClicked && (
          <SubmitNegativeFeedback
            url={url}
            title={dynamicPageItem.fields.title}
            setNegativeFeedbackClicked={setNegativeFeedbackClicked}
            setNegativeFeedbackSubmitted={setNegativeFeedbackSubmitted}
          />
        )}
    </div>
    
  );
}

const syncArticleNav = ({
  $articleNavHeaders,
  $articleHeaders,
}) => {
  //determine scroll position of container
  let scrollPos = document.documentElement.scrollTop;

  //find the headers we've already scrolled psat
  let $articleHeadersScrolledPast = [];
  $articleHeaders.forEach((element, idx) => {
    if (scrollPos >= element.offsetTop - 60) {
      $articleHeadersScrolledPast.push(element);
    }
  });

  let $activeHeader = null;
  if ($articleHeadersScrolledPast.length > 0) {
    $activeHeader =
      $articleHeadersScrolledPast[$articleHeadersScrolledPast.length - 1];
  } else {
    //default to first header
    $activeHeader = $articleHeaders[0];
  }

  //update the classes on the Article Nav List
  for (const obj of $articleNavHeaders) {
    if (`#${$activeHeader.id}` === obj.getAttribute("href")) {
      obj.classList.add("bg-lightGray", "text-darkestGray");
    } else {
      obj.classList.remove("bg-lightGray", "text-darkestGray");
    }
  }
};

const sendPositiveFeedback = ({ url, title, setPositiveFeedbackSubmitted }) => {
  //fire and forget
  axios.post(`${nextConfig.basePath}/api/feedback/sendPositive`, {
    url,
    title,
  });

  setPositiveFeedbackSubmitted(true);
};
