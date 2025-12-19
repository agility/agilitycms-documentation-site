'use client'

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import nProgress from "nprogress";
import HeadSEO from "./HeadSEO";
import LoadingWidget from "./LoadingWidget";
import Header from "../common/Header";
import PreviewWidget from "./PreviewWidget";
import CMSWidget from "./CMSWidget";
import { GoogleTagManager } from '@next/third-parties/google'
import { Intercom } from "@intercom/messenger-js-sdk";

function Layout(props: any) {
  const { page, sitemapNode, dynamicPageItem, notFound, isPreview, isDevelopmentMode, children } = props;

  const pathname = usePathname();

  useEffect(() => {
    Intercom({
      app_id: 'fj9g3mkl',
    });
  }, []);

  // Handle scroll to top on route change
  useEffect(() => {
    const handleScrollTop = () => {
      const $scrollContainer = document.getElementById("ScrollContainer");
      if ($scrollContainer) {
        $scrollContainer.scrollTop = 0;
      }
    };

    // Scroll to top when pathname changes
    handleScrollTop();

    // Show progress bar on navigation (App Router handles this differently)
    // Note: App Router doesn't have router.events, so we use pathname changes
    nProgress.start();
    const timer = setTimeout(() => {
      nProgress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
      nProgress.done();
    };
  }, [pathname]);

  // if page not found, this should be handled by notFound() in page component
  // But keep this as a fallback
  if (notFound === true) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl">Page Not Found</p>
      </div>
    );
  }

  // if we have a dynamic item and it has a field called `description` use it
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
            {children}
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
