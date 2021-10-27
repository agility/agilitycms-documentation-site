import { getHrefTarget } from "./linkUtils";
import { parse } from "node-html-parser";

const renderHTML = (html, mainSite) => {
  if (!html) return { __html: "" };
  return { __html: cleanHTML(html, mainSite) };
};

const cleanHTML = (html, mainSite) => {
  if (!html) return "";

  //fix '~' in links in HTML
  html = html.replace(/href="~\//gi, 'href="/');

  //set '_blank' target for absolute domains links
  const parsedHTML = parse(html);
  const links = parsedHTML.querySelectorAll("a");

  const isUrlAbsolute = (url) =>
    url.indexOf("://") > 0 || url.indexOf("//") === 0;

  for (const link of links) {
    // get link path
    const path = link.getAttribute("href");

    // if url is not absolute and is main site, append main site url
    if (isUrlAbsolute(path) === false && mainSite === true) {
      link.setAttribute("href", `https://www.agilitycms.com${path}`);
    }

    //set the appropriate target for the link
    const target = getHrefTarget(link.getAttribute("href"));
    link.setAttribute("target", target);
    if (target === "_blank") {
      link.setAttribute("rel", "noopener");
    }
    //just in case we have some extra styles that somehow got pasted in...
    link.setAttribute("style", null);
    // console.log(isUrlAbsolute(link));
  }

  if (links.length > 0) {
    html = parsedHTML.toString();
  }

  return html;
};

export { renderHTML };
