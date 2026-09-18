import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Footer from "../common/Footer";
import ArticleNav from "../common/ArticleNav";
import { getPageHeadings } from "lib/docs/renderPageSections";

// Containerless — modules self-wrap (ocean-band px + centered --wrap column).
// No nested overflow scroller: the page scrolls naturally (the inner-scroll
// pattern broke scrolling entirely on iPad — see WithSidebarNavTemplate).
// props: the full Agility page props (page, sitemapNode, languageCode,
// isPreview, ...) spread through to ContentZone — loose CMS shape.
const MainTemplate = (props: any) => {
  // Long hub pages (/docs/ai) earn an on-this-page rail; short ones
  // (/docs/web-studio, /docs/page-management) come back with [] and render
  // exactly as before — grid and all. See MIN_HEADINGS_FOR_PAGE_NAV.
  const headings = getPageHeadings(props.page);
  const hasNav = headings.length > 0;

  return (
    <>
      <div id="MainTemplate" className="grow bg-(--bg) text-(--text)">
        {/* Only pages with a nav get the grid, so nothing moves on the pages
            that don't have one. data-article-scope is the boundary ArticleNav
            resolves its headings within — same contract as the article
            template, so a client transition can't mix two pages' headings. */}
        <div
          data-article-scope={hasNav ? "" : undefined}
          className={
            hasNav
              ? "mx-auto grid max-w-[1400px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] xl:gap-x-11"
              : ""
          }
        >
          {/* min-w-0: without it the code panels' overflow-x-auto measures
              against their content and blows the column out of the grid. */}
          <div id="ContentContainer" className={hasNav ? "min-w-0" : ""}>
            <ContentZone
              name="MainContentZone"
              {...props}
              getModule={getModule}
            />
          </div>

          {hasNav && (
            <div className="hidden xl:block pr-[var(--space)]">
              {/* Headings come from the same cached pass the ProseSections use
                  to put ids on their H2s, so the rail is in the SSR HTML and
                  cannot list an anchor the body doesn't have. */}
              <div className="sticky top-[60px] pt-12">
                <ArticleNav headings={headings} bodySelector="#ContentContainer" />
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer languageCode={props.languageCode} isPreview={props.isPreview} />
    </>
  );
};

export default MainTemplate;
