import { getPageTemplate } from "components/agility-pageTemplates";
import { useEffect } from "react";
import { handlePreview } from "@agility/nextjs";
import { useRouter } from "next/router";
import Error from "next/error";
import HeadSEO from "./HeadSEO";
import LoadingWidget from "./LoadingWidget";
import Header from '../common/Header'
import PreviewWiget from "./PreviewWidget";
import nextConfig from "next.config";

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

  if (dynamicPageItem?.seo?.metaDescription) {
    page.seo.metaDescription = dynamicPageItem.seo.metaDescription;
  }

  return (
    <>
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
            <PreviewWiget isPreview={props.isPreview} isDevelopmentMode={props.isDevelopmentMode} />
          </div>
        )}
      </div>
    </>
  );
}

export default Layout;
