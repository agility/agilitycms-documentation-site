import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Footer from "../common/Footer";

// Containerless — modules self-wrap (ocean-band px + centered --wrap column).
// No nested overflow scroller: the page scrolls naturally (the inner-scroll
// pattern broke scrolling entirely on iPad — see WithSidebarNavTemplate).
// props: the full Agility page props (page, sitemapNode, languageCode,
// isPreview, ...) spread through to ContentZone — loose CMS shape.
const MainTemplate = (props: any) => {
  return (
    <>
      <div id="MainTemplate" className="grow bg-(--bg) text-(--text)">
        <div id="ContentContainer">
          <ContentZone
            name="MainContentZone"
            {...props}
            getModule={getModule}
          />
        </div>
      </div>
      <Footer languageCode={props.languageCode} isPreview={props.isPreview} />
    </>
  );
};

export default MainTemplate;
