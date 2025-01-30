import { getPageTemplate } from "components/agility-pageTemplates";
import { useEffect, useState } from "react";
import { handlePreview } from "@agility/nextjs";
import { useRouter } from "next/router";
import nProgress from "nprogress";
import Error from "next/error";
import HeadSEO from "./HeadSEO";
import LoadingWidget from "./LoadingWidget";
import Header from "../common/Header";
import PreviewWidget from "./PreviewWidget";
import CMSWidget from "./CMSWidget";
import nextConfig from "next.config";
import Script from "next/script";
import { GoogleTagManager } from '@next/third-parties/google'


// set up handle preview
const isPreview = handlePreview({
  previewHandlerUrl: `${nextConfig.basePath}/api/preview`,
});

function Layout(props) {
  const { page, sitemapNode, dynamicPageItem, notFound, pageTemplateName } =
    props;

  const router = useRouter();

  // if the route changes, scroll our scrollable container back to the top
  useEffect(() => {
    const handleScrollTop = () => {
      const $scrollContainer = document.getElementById("ScrollContainer");
      if ($scrollContainer) {
        $scrollContainer.scrollTop = 0;
      }
    };
    //scroll top
    router.events.on("routeChangeComplete", handleScrollTop);
    router.events.on("routeChangeError", handleScrollTop);

    //load progress
    router.events.on("routeChangeStart", nProgress.start);
    router.events.on("routeChangeError", nProgress.done);
    router.events.on("routeChangeComplete", nProgress.done);

    return () => {
      router.events.off("routeChangeComplete", handleScrollTop);
      router.events.off("routeChangeError", handleScrollTop);
      router.events.off("routeChangeStart", nProgress.start);
      router.events.off("routeChangeError", nProgress.done);
      router.events.off("routeChangeComplete", nProgress.done);
    };
  }, [router]);

  // If the page is not yet generated, this will be displayed
  // initially until getStaticProps() finishes running
  if (router.isFallback) {
    return <LoadingWidget message="Loading Page" />;
  }

  // if page not found, throw 404
  if (notFound === true) {
    return <Error statusCode={404} />;
  }

  const AgilityPageTemplate = getPageTemplate(pageTemplateName);

  // if we have a dynamic item and it has a field called `decription` use it
  if (
    dynamicPageItem?.fields?.description &&
    dynamicPageItem.fields.description.length > 0
  ) {
    page.seo.metaDescription = dynamicPageItem?.fields?.description;
  }

  // set the meta description for a dynamic item
  if (
    dynamicPageItem?.seo?.metaDescription &&
    dynamicPageItem.seo.metaDescription.length > 0
  ) {
    page.seo.metaDescription = dynamicPageItem.seo.metaDescription;
  }

  // set the meta title for a dynamic item
  if (
    dynamicPageItem?.fields?.metaTitle &&
    dynamicPageItem?.fields?.metaTitle.length > 0
  ) {
    sitemapNode.title = dynamicPageItem?.fields?.metaTitle;
  }

  if (dynamicPageItem?.seo?.sitemapVisible === false) {
    page.seo.noIndex = true;
  }

  return (
    <>
      {/* Hubspot Chat */}
      <Script type="text/javascript" id="hs-script-loader" async defer src="//js-na1.hs-scripts.com/23239214.js"></Script>

      {/* Google Tag Manager */}
      <GoogleTagManager gtmId="GTM-NJW8WMX" />

      <HeadSEO
        title={sitemapNode?.title}
        description={page.seo.metaDescription}
        keywords={page.seo.metaKeywords}
        metaHTML={page.seo.metaHTML}
        noIndex={page.seo.noIndex}
      />
      <div id="SiteWrapper" className="h-full font-muli">
        {isPreview && <LoadingWidget message="Loading Preview Mode" />}
        {!isPreview && (
          <div id="Site" className="flex flex-col h-full">
            <Header
              mainMenuLinks={props.mainMenuLinks}
              primaryDropdownLinks={props.primaryDropdownLinks}
              secondaryDropdownLinks={props.secondaryDropdownLinks}
              marketingContent={props.marketingContent}
              preHeader={props.preHeader}
            />
            <AgilityPageTemplate {...props} />
            <PreviewWidget
              isPreview={props.isPreview}
              isDevelopmentMode={props.isDevelopmentMode}
            />
            <CMSWidget
              page={props.page}
              dynamicPageItem={props.dynamicPageItem}
              isPreview={props.isPreview}
              isDevelopmentMode={props.isDevelopmentMode}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default Layout;
