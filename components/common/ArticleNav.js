/* This example requires Tailwind CSS v2.0+ */
import { useEffect } from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ArticleNav({ headings }) {
  //set up the Article Nav sync for the reader
  useEffect(() => {
    const $scrollContainer = document.getElementById("ScrollContainer");
    const $articleNav = document.getElementById("ArticleNav");

    //if we don't have an article nav or scroll container, return and don't do anything
    if (!$articleNav || !$scrollContainer) return;

    const $articleNavHeaders = $articleNav.children;
    const $articleHeaders = document.querySelectorAll(
      "#DynamicArticleDetails h2"
    );

    //run on load...
    syncArticleNav({
      $scrollContainer,
      $articleNav,
      $articleHeaders,
      $articleNavHeaders,
    });

    //run again when we scroll
    $scrollContainer.onscroll = () => {
      syncArticleNav({
        $scrollContainer,
        $articleNav,
        $articleHeaders,
        $articleNavHeaders,
      });
    };

    return () => ($scrollContainer.onscroll = null);
  }, []);

  const navigation = [];
  headings.map((heading, idx) => {
    navigation.push({
      name: heading.data.text,
      href: `#${heading.id}`,
      current: false, //property not being used, classes are applied manually using DOM manipulation -- see `syncArticleNav`
    });
  });

  return (
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
  );
}

const syncArticleNav = ({
  $scrollContainer,
  $articleNav,
  $articleNavHeaders,
  $articleHeaders,
}) => {
  //determine scroll position of container
  let scrollPos = $scrollContainer.scrollTop;

  //find the headers we've already scrolled psat
  let $articleHeadersScrolledPast = [];
  $articleHeaders.forEach((element, idx) => {
    if (scrollPos >= element.offsetTop - 60) {
      $articleHeadersScrolledPast.push(element);
    } else if (
      idx === $articleHeaders.length - 1 && //if this is the last item
      parseInt($scrollContainer.scrollTop) ===
        $scrollContainer.scrollHeight - $scrollContainer.offsetHeight
    ) {
      //we have scrolled to the bottom, ensure we have the last heading selected
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
