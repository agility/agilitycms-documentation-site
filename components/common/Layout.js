import { getPageTemplate } from "components/agility-pageTemplates";
import { useEffect } from "react";
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
import { GoogleTagManager } from '@next/third-parties/google'
import { Intercom, show } from "@intercom/messenger-js-sdk";
import { useIntercomHash } from "../../hooks/useIntercomHash";


// set up handle preview
const isPreview = handlePreview({
  previewHandlerUrl: `${nextConfig.basePath}/api/preview`,
});

function Layout(props) {
  const { page, sitemapNode, dynamicPageItem, notFound, pageTemplateName } =
    props;

  const router = useRouter();
  
  // TODO: Replace with actual user data from your authentication system
  const user = {
    isAuthenticated: true, // Changed to true for testing - set to false for anonymous
    email: 'john.doe@example.com',
    name: 'John Doe',
    customAttributes: {
      company: 'Acme Inc',
      plan: 'Pro',
    }
  };

  // Only fetch user hash for authenticated users (when Identity Verification is required)
  const { userHash, loading, error } = useIntercomHash(user.isAuthenticated ? user.email : null);

	useEffect(() => {
		console.log('Intercom initialization:', { 
			isAuthenticated: user.isAuthenticated, 
			userHash: !!userHash, 
			loading, 
			error 
		});

		if (user.isAuthenticated) {
			// Authenticated user - use Identity Verification if enabled in Intercom
			if (userHash && !loading && !error) {
				console.log('Initializing Intercom with Identity Verification');
				Intercom({
					app_id: 'fj9g3mkl',
					name: user.name,
					email: user.email,
					created_at: 1620000000,
					custom_attributes: user.customAttributes,
					user_hash: userHash, // Include hash for Identity Verification
				});
			} else if (!loading && !userHash) {
				// Fallback: authenticated user without Identity Verification
				console.log('Initializing Intercom for authenticated user (no Identity Verification)');
				Intercom({
					app_id: 'fj9g3mkl',
					name: user.name,
					email: user.email,
					created_at: 1620000000,
					custom_attributes: user.customAttributes,
				});
			}
		} else {
			// Anonymous/unauthenticated user - minimal config
			console.log('Initializing Intercom for anonymous user');
			Intercom({
				app_id: 'fj9g3mkl',
				// No user-specific data for anonymous users
			});
		}

		// For testing: manually show the launcher after a short delay
		setTimeout(() => {
			try {
				show();
				console.log('Manually showing Intercom launcher');
			} catch (err) {
				console.log('Could not manually show launcher:', err.message);
			}
		}, 1000);
		
	}, [user.isAuthenticated, user.email, userHash, loading, error]);

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
