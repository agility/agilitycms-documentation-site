"use client";

import { useEffect, useState } from "react";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface NavItem {
  name: string;
  href: string;
  current: boolean;
}

interface ArticleNavProps {
  dynamicPageItem: any;
  sitemapNode: any;
}

export default function ArticleNav({ dynamicPageItem }: ArticleNavProps) {
  const [navigation, setNavigation] = useState<NavItem[]>([]);

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
      const navItems: NavItem[] = [];
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
        {/* Key on the anchor + index, never the heading text: articles legitimately
            repeat an H2 (e.g. two "Features" sections), which collided on `name`.
            The id is normally unique (EditorJS block id, or github-slugger's
            deduped slug for markdown), but raw HTML in markdown can hand-author a
            duplicate id — rehype-slug only fills in missing ones — so the index
            keeps the key unique either way. Safe as a key here: the list is
            rebuilt wholesale from DOM order, never reordered or spliced. */}
        {navigation.map((item, idx) => (
          <a
            key={`${item.href}-${idx}`}
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
    </div>
  );
}

const syncArticleNav = ({ $articleNavHeaders, $articleHeaders }: any) => {
  //determine scroll position of container
  let scrollPos = document.documentElement.scrollTop;

  //find the headers we've already scrolled psat
  let $articleHeadersScrolledPast: any[] = [];
  $articleHeaders.forEach((element: any, idx: number) => {
    if (scrollPos >= element.offsetTop - 60) {
      $articleHeadersScrolledPast.push(element);
    }
  });

  let $activeHeader: any = null;
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
