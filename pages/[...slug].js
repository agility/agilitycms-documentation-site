import Layout from "components/common/Layout";
import { getAgilityPageProps, getAgilityPaths } from "@agility/nextjs/node";
import { getModule } from "components/agility-pageModules";
import { client }  from 'agility-graphql-client';
import { gql } from "@apollo/client";
import { global } from "@apollo/client/utilities/globals";

const cacheSitemapInGraphQL = ({ sitemap, isPreview, isDevelopmentMode }) => {
  //a hook that can be used to cache the sitemap so we don't need to request it up again within the app
  
  //convert to array which can be safely written to GraphQL
  const sitemapFlat = Object.keys(sitemap).map((item) => {
    if(!sitemap[item].contentID) sitemap[item].contentID = -1;
    return sitemap[item];
  })

  //write the sitemap to graphQL cache... you can freely use it later - does not support any filtering
  client.writeQuery({
    query: gql`
      query WriteSitemapFlat {
        sitemap {
          title
          name
          path
          pageID
          isFolder
          redirect
          visible {
            menu
            sitemap
          } 
          contentID         
        }
      }`,
    data: {
      sitemap: sitemapFlat
    },
    variables: {}
  });

}

// getStaticProps function fetches data for all of your Agility Pages and Next.js will pre-render these pages at build time
export async function getStaticProps({
  preview,
  params,
  locale,
  defaultLocale,
  locales,
}) {

  //HACK: set a global variable that our GraphQL client can read to determine whether we are in preview or not...
  global.IS_PREVIEW = true;

  const agilityProps = await getAgilityPageProps({
    preview,
    params,
    locale,
    getModule,
    defaultLocale,
    apiOptions: {
      expandAllContentLinks: false, //override this so that we don't get too much data back in GetPage API calls
      contentLinkDepth: 2, 
      onSitemapRetrieved: cacheSitemapInGraphQL //cache the sitemap in GraphQL so we can access it again from any component
    }
  });

  

  if (!agilityProps || agilityProps.notFound) {
    // We throw to make sure this fails at build time as this is never expected to happen
    return {
      notFound: true
    }
  }

  //TODO: do any other data lookups we need for global components like Header/Footer that aren't Page Modules
  //here

  return {
    // return all props
    props: agilityProps,

    // Next.js will attempt to re-generate the page when a request comes in, at most once every 10 seconds
    // Read more on Incremental Static Regenertion here: https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration
    revalidate: 10,
  };
}

// Next.js will statically pre-render all the paths from Agility CMS
export async function getStaticPaths({ locales, defaultLocale }) {
  //get the paths configured in agility
  let agilityPaths = await getAgilityPaths({
    preview: false,
    locales,
    defaultLocale,
  });

  return {
    paths: agilityPaths,
    fallback: true,
  };
}

const AgilityPage = (props) => {
  return <Layout {...props} />;
};

export default AgilityPage;
