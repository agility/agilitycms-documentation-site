import { getPageTemplate } from "components/agility-pageTemplates";
import { useEffect } from "react";
import { handlePreview } from "@agility/nextjs";
import { useRouter } from "next/router";
import Error from "next/error";
import HeadSEO from "./HeadSEO";
import LoadingWidget from "./LoadingWidget";
import Header from '../common/Header'
import PreviewWidget from "./PreviewWidget";
import CMSWidget from "./CMSWidget";
import nextConfig from "next.config";
import Script from 'next/script';

// set up handle preview
const isPreview = handlePreview({previewHandlerUrl: `${nextConfig.basePath}/api/preview`});

function Layout(props) {
  const { page, sitemapNode, dynamicPageItem, notFound, pageTemplateName } =
    props;

  const router = useRouter();

  // if the route changes, scroll our scrollable container back to the top
  useEffect(() => {
    const handleStop = () => {
      const $scrollContainer = document.getElementById('ScrollContainer');
      if($scrollContainer) {
        $scrollContainer.scrollTop = 0;
      }
    }
    router.events.on('routeChangeComplete', handleStop)
    router.events.on('routeChangeError', handleStop)

    return () => {
      router.events.off('routeChangeComplete', handleStop)
      router.events.off('routeChangeError', handleStop)
    }
  }, [router])

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
  if(dynamicPageItem?.fields?.description && dynamicPageItem.fields.description.length > 0) {
    page.seo.metaDescription = dynamicPageItem?.fields?.description;
  }

  // 
  if (dynamicPageItem?.seo?.metaDescription && dynamicPageItem.seo.metaDescription.length > 0) {
    page.seo.metaDescription = dynamicPageItem.seo.metaDescription;
  }

  return (
    <>
      {/* Zendesk Chat */}
      <Script id="ze-snippet" src="https://static.zdassets.com/ekr/snippet.js?key=75a855ec-8bb9-4017-a4d7-ebf0e3d7c77a"> </Script>
      <HeadSEO
        title={sitemapNode?.title}
        description={page.seo.metaDescription}
        keywords={page.seo.metaKeywords}
        metaHTML={page.seo.metaHTML}
      />
      <div id="SiteWrapper" className="h-full">
        {isPreview && <LoadingWidget message="Loading Preview Mode" />}
        {!isPreview && (
          <div id="Site" className="flex flex-col h-full">
            <Header mainMenuLinks={props.mainMenuLinks} primaryDropdownLinks={props.primaryDropdownLinks} secondaryDropdownLinks={props.secondaryDropdownLinks} />
            <AgilityPageTemplate {...props} />
            <PreviewWidget isPreview={props.isPreview} isDevelopmentMode={props.isDevelopmentMode} />
            <CMSWidget page={props.page} dynamicPageItem={props.dynamicPageItem} isPreview={props.isPreview} isDevelopmentMode={props.isDevelopmentMode} />
          </div>
        )}
      </div>
    </>
  );
}

export default Layout;
