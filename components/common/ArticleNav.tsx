"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface NavItem {
  name: string;
  id: string;
}

interface ArticleNavProps {
  dynamicPageItem: any;
  sitemapNode: any;
}

/**
 * Fallback only. The real value comes from the `--heading-scroll-offset` custom
 * property so the CSS that positions a heading after an anchor jump and the JS
 * that decides which heading is active read the same number.
 */
const FALLBACK_OFFSET = 80;

const readScrollOffset = () => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--heading-scroll-offset"
  );
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : FALLBACK_OFFSET;
};

export default function ArticleNav({ dynamicPageItem }: ArticleNavProps) {
  const [navigation, setNavigation] = useState<NavItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const headingsRef = useRef<HTMLElement[]>([]);

  const content = dynamicPageItem.fields.content;
  const markdownContent = dynamicPageItem.fields.markdownContent;

  /**
   * Which heading is "current": the last one whose top has reached the offset
   * where anchor jumps park it.
   *
   * Measured with getBoundingClientRect rather than offsetTop. offsetTop is
   * relative to the nearest positioned ancestor, and this article sits inside
   * positioned/sticky wrappers, so it does not reliably give a document
   * coordinate. Viewport coordinates sidestep that entirely.
   *
   * The +1 absorbs sub-pixel scroll positions: browsers report fractional
   * scrollTop on trackpads and at fractional zoom levels, so a heading that
   * "should" sit exactly at the offset can measure 79.6 and be missed.
   */
  const sync = useCallback(() => {
    const headings = headingsRef.current;
    if (headings.length === 0) return;

    const offset = readScrollOffset();
    let active = headings[0];

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= offset + 1) {
        active = heading;
      } else {
        break; // headings are in document order; the rest are further down
      }
    }

    setActiveId(active.id || null);
  }, []);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;

    // The markdown/EditorJS body is processed after mount, so wait a tick for
    // the headings (and their ids) to exist before reading them.
    const timer = setTimeout(() => {
      if (cancelled) return;

      const headings = Array.from(
        document.querySelectorAll<HTMLElement>("#DynamicArticleDetails h2")
      ).filter((h) => h.id && h.textContent);

      headingsRef.current = headings;
      setNavigation(
        headings.map((h) => ({ name: h.textContent as string, id: h.id }))
      );

      if (headings.length === 0) return;
      sync();

      // addEventListener, not window.onscroll: assigning onscroll silently
      // replaces whatever else on the page is listening.
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      // Anchor clicks and browser-restored scroll positions don't always emit a
      // scroll event before paint; hashchange covers the click case.
      window.addEventListener("hashchange", onScroll);
    }, 100);

    // rAF-throttled: scroll fires far more often than we can usefully re-measure,
    // and every call reads layout.
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
    };
  }, [content, markdownContent, sync]);

  if (navigation.length === 0) return null;

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
        {navigation.map((item, idx) => {
          const current = item.id === activeId;
          return (
            <a
              key={`${item.id}-${idx}`}
              href={`#${item.id}`}
              className={classNames(
                current
                  ? "border-(--primary) text-(--primary)"
                  : "border-(--border) text-(--muted) hover:border-(--border-strong) hover:text-(--text)",
                "block border-l-2 py-1.5 pl-3 font-medium"
              )}
              aria-current={current ? "location" : undefined}
            >
              <span className="block truncate">{item.name}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
