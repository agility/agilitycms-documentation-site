"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArticleHeading } from "lib/docs/renderArticleBody";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface ArticleNavProps {
  /**
   * Headings derived on the SERVER (lib/docs/renderArticleBody). This used to be
   * scraped out of the DOM in an effect, which had two problems: the list only
   * appeared once the article body had hydrated — up to ~9s on the largest
   * pages — and the query was document-wide, so during an App Router client
   * transition, when the outgoing page is still mounted, it merged two
   * articles' headings and listed sections that were not on the page.
   *
   * As a prop the list is in the server-rendered HTML, correct immediately and
   * with no JavaScript. Only the active-section highlight below needs the client.
   */
  headings: ArticleHeading[];
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

export default function ArticleNav({ headings }: ArticleNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const elementsRef = useRef<HTMLElement[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
    const elements = elementsRef.current;
    if (elements.length === 0) return;

    const offset = readScrollOffset();
    let active = elements[0];

    for (const heading of elements) {
      if (heading.getBoundingClientRect().top <= offset + 1) {
        active = heading;
      } else {
        break; // headings are in document order; the rest are further down
      }
    }

    setActiveId(active.id || null);
  }, []);

  const ids = headings.map((h) => h.id).join("|");

  useEffect(() => {
    if (headings.length === 0) return;
    let frame = 0;

    /**
     * Resolve the heading elements for the scroll-spy. Scoped to the nearest
     * [data-article-scope] — the grid in WithSidebarNavTemplate wrapping both
     * the article body and this nav — rather than `document`, because during a
     * client transition two articles are briefly mounted and a bare
     * getElementById would happily return the outgoing page's heading.
     */
    const resolve = () => {
      const scope = rootRef.current?.closest<HTMLElement>("[data-article-scope]");
      const body = scope?.querySelector<HTMLElement>("#DynamicArticleDetails");
      if (!body) return false;
      const found = headings
        .map((h) => body.querySelector<HTMLElement>(`#${CSS.escape(h.id)}`))
        .filter((el): el is HTMLElement => el !== null);
      elementsRef.current = found;
      return found.length > 0;
    };

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    }

    if (resolve()) sync();

    // addEventListener, not window.onscroll: assigning onscroll silently
    // replaces whatever else on the page is listening.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Anchor clicks and browser-restored scroll positions don't always emit a
    // scroll event before paint; hashchange covers the click case.
    window.addEventListener("hashchange", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", onScroll);
    };
    // `ids` rather than `headings`: the array identity changes every render but
    // the content rarely does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, sync]);

  if (headings.length === 0) return null;

  return (
    <div ref={rootRef} className="font-muli text-[.8rem]">
      <div className="mb-3 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
        On this page
      </div>
      <nav id="ArticleNav" aria-label="Article Nav">
        {/* Key on the anchor + index, never the heading text: articles legitimately
            repeat an H2 (e.g. two "Features" sections), which collided on `name`.
            The id is normally unique (EditorJS block id, or github-slugger's
            deduped slug for markdown), but raw HTML in markdown can hand-author a
            duplicate id — rehype-slug only fills in missing ones — so the index
            keeps the key unique either way. */}
        {headings.map((item, idx) => {
          const current = item.id === activeId;
          return (
            <a
              key={`${item.id}-${idx}`}
              href={`#${item.id}`}
              className={classNames(
                current
                  ? "border-(--primary) text-(--primary-text)"
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
