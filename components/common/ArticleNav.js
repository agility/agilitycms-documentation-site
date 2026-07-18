"use client";

/* This example requires Tailwind CSS v2.0+ */
import { useEffect, useState } from "react";
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
  const [navigation, setNavigation] = useState([]);
  const url = `${nextConfig.basePath}${sitemapNode.path}`;

  const content = dynamicPageItem.fields.content;
  const markdownContent = dynamicPageItem.fields.markdownContent;

  //set up the Article Nav sync for the reader
  useEffect(() => {
    // Use a timeout to allow markdown processing to complete
    const timer = setTimeout(() => {
      const $articleNav = document.getElementById("ArticleNav");
      const $articleHeaders = document.querySelectorAll(
        "#DynamicArticleDetails h2"
      );

      //if we don't have an article nav or no headers, return and don't do anything
      if (!$articleNav || $articleHeaders.length === 0) return;

      // Build navigation from actual rendered H2 elements
      const navItems = [];
      $articleHeaders.forEach((header) => {
        if (header.id && header.textContent) {
          navItems.push({
            name: header.textContent,
            href: `#${header.id}`,
            current: false,
          });
        }
      });

      setNavigation(navItems);

      const $articleNavHeaders = $articleNav.children;

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
    }, 100);

    return () => {
      clearTimeout(timer);
      window.onscroll = null;
    };
  }, [content, markdownContent]);

  return (
    <div className="font-muli text-[.8rem]">
      <div className="mb-3 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
        On this page
      </div>
      <nav id="ArticleNav" aria-label="Article Nav">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={classNames(
              item.current
                ? "border-(--primary) text-(--primary)"
                : "border-(--border) text-(--muted) hover:border-(--border-strong) hover:text-(--text)",
              "block border-l-2 py-1.5 pl-3 font-medium"
            )}
            aria-current={item.current ? "page" : undefined}
          >
            <span className="block truncate">{item.name}</span>
          </a>
        ))}
      </nav>
      <div className="mt-8 border-t border-(--border) pt-6" />
      {!positiveFeedbackSubmitted && !negativeFeedbackSubmitted && (
        <div>
          <div className="text-center text-(--text-2)">
            Was this article helpful?
          </div>
          <div className="flex flex-row mt-2 justify-center space-x-4">
            <button
              className="text-(--text-2) hover:text-(--primary) bg-(--raised) p-3 rounded-full"
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
              className="text-(--text-2) hover:text-(--primary) bg-(--raised) p-3 rounded-full"
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
          <div className="text-center text-(--text-2)">
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

const syncArticleNav = ({ $articleNavHeaders, $articleHeaders }) => {
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
    if (`#${$activeHeader?.id}` === obj.getAttribute("href")) {
      obj.classList.add("border-(--primary)", "text-(--primary)");
      obj.classList.remove("border-(--border)", "text-(--muted)");
    } else {
      obj.classList.remove("border-(--primary)", "text-(--primary)");
      obj.classList.add("border-(--border)", "text-(--muted)");
    }
  }
};

const sendPositiveFeedback = ({ url, title, setPositiveFeedbackSubmitted }) => {
  //fire and forget
  fetch(`${nextConfig.basePath}/api/feedback/sendPositive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, title }),
  });

  setPositiveFeedbackSubmitted(true);
};
