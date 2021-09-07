import { getPageTemplate } from "components/agility-pageTemplates";
import { handlePreview } from "@agility/nextjs";
import { useRouter } from "next/router";
import Error from "next/error";
import Head from "./Head";
import LoadingWidget from "./LoadingWidget";
import Header from '../common/Header'
import PreviewWiget from "./PreviewWidget";


// set up handle preview
const isPreview = handlePreview();

function Layout(props) {
  const { page, sitemapNode, dynamicPageItem, notFound, pageTemplateName } =
    props;

  // If the page is not yet generated, this will be displayed
  // initially until getStaticProps() finishes running
  const router = useRouter();
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
      <Head
        title={sitemapNode?.title}
        description={page.seo.metaDescription}
        keywords={page.seo.metaKeywords}
        metaHTML={page.seo.metaHTML}
      />
      <div id="SiteWrapper" className="h-full">
        {isPreview && <LoadingWidget message="Loading Preview Mode" />}
        {!isPreview && (
          <div id="Site" className="flex flex-col h-full">
            <Header mainMenuLinks={props.mainMenuLinks} />
            <AgilityPageTemplate {...props} />
            <PreviewWiget isPreview={props.isPreview} isDevelopmentMode={props.isDevelopmentMode} />
          </div>
        )}
      </div>
    </>
  );
}

export default Layout;
